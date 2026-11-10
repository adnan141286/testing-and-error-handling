import http from 'http';
import { Express } from 'express';
import { EnvConfig, env } from './config/env';
import { createApp } from './app';
import { logger } from './utils/logger';
import { initDbSchema } from './utils/db';
import { getPriceSampler } from './services/sampler';
import { CacheManager } from './services/cache';

export interface ShutdownOptions {
  timeoutMs?: number;
  exitProcess?: boolean;
}

/**
 * Gracefully shuts down HTTP server and active connections.
 *
 * @param server - Active HTTP server instance
 * @param reason - Reason or signal triggering shutdown
 * @param options - Shutdown configuration options
 * @returns Promise that resolves once server is closed
 */
export const gracefulShutdown = (
  server: http.Server,
  reason: string,
  options: ShutdownOptions = {},
): Promise<void> => {
  const timeoutMs = options.timeoutMs ?? 10000;
  const exitProcess = options.exitProcess ?? process.env.NODE_ENV !== 'test';

  logger.info({ reason }, 'Initiating graceful server shutdown');

  return new Promise<void>((resolve) => {
    let resolved = false;

    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        logger.error({ timeoutMs }, 'Graceful shutdown timed out; forcing socket termination');
        resolve();
        if (exitProcess) {
          process.exit(1);
        }
      }
    }, timeoutMs);

    // Unref timer so it does not keep process open
    if (timeoutTimer.unref) {
      timeoutTimer.unref();
    }

    server.close((err?: Error) => {
      clearTimeout(timeoutTimer);
      if (!resolved) {
        resolved = true;
        if (err) {
          logger.error({ err }, 'Error occurred while closing HTTP server');
        } else {
          logger.info('HTTP server closed successfully');
        }
        resolve();
        if (exitProcess) {
          process.exit(err ? 1 : 0);
        }
      }
    });
  });
};

/**
 * Registers process signal and global error lifecycle handlers for unhandled rejections and exceptions.
 *
 * @param server - Active HTTP server instance
 * @param exitOnFatal - Whether to terminate process on fatal exceptions (default: true)
 */
export const registerProcessHandlers = (server: http.Server, exitOnFatal = true): void => {
  const handleFatal = (type: string, error: unknown): void => {
    logger.fatal({ err: error, type }, 'Fatal runtime condition detected');
    void gracefulShutdown(server, type, { exitProcess: exitOnFatal });
  };

  process.once('SIGTERM', () => {
    void gracefulShutdown(server, 'SIGTERM', { exitProcess: exitOnFatal });
  });

  process.once('SIGINT', () => {
    void gracefulShutdown(server, 'SIGINT', { exitProcess: exitOnFatal });
  });

  process.on('unhandledRejection', (reason) => {
    handleFatal('unhandledRejection', reason);
  });

  process.on('uncaughtException', (error) => {
    handleFatal('uncaughtException', error);
  });
};

/**
 * Starts the HTTP server and registers process-level lifecycle handlers.
 *
 * @param config - Application environment configuration
 * @param appInstance - Optional pre-configured Express instance
 * @returns Started HTTP server instance
 */
export const startServer = (config: EnvConfig = env, appInstance?: Express): http.Server => {
  const app = appInstance ?? createApp(config);
  const server = app.listen(config.PORT, config.HOST, () => {
    logger.info(
      { port: config.PORT, host: config.HOST, env: config.NODE_ENV },
      'Whalepath server running',
    );

    // Clear cache, initialize database schema and background price sampler in non-test env
    if (config.NODE_ENV !== 'test') {
      void initDbSchema().catch(() => {});
      const cache = new CacheManager();
      void cache.clear().finally(() => {
        const sampler = getPriceSampler();
        void sampler.seedFromCoinGecko().finally(() => {
          sampler.start();
        });
      });
    }
  });

  registerProcessHandlers(server, config.NODE_ENV !== 'test');
  return server;
};

/* istanbul ignore if */
if (require.main === module) {
  startServer();
}
