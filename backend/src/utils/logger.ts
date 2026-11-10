import pino, { Logger as PinoLogger, LoggerOptions as PinoOptions } from 'pino';
import { env, EnvConfig } from '../config/env';

export type Logger = PinoLogger;

export interface AppLoggerOptions {
  level?: string;
  name?: string;
  redact?: string[];
}

/**
 * Creates and configures a Pino logger instance supporting dependency injection.
 *
 * @param options - Custom options for this logger instance
 * @param config - Application environment configuration
 * @returns Configured Pino Logger instance
 */
export const createLogger = (options: AppLoggerOptions = {}, config: EnvConfig = env): Logger => {
  const isTest = config.NODE_ENV === 'test';
  const isDev = config.NODE_ENV === 'development';

  const defaultLevel = isTest ? 'silent' : config.LOG_LEVEL;
  const level = options.level ?? defaultLevel;

  const pinoConfig: PinoOptions = {
    name: options.name ?? 'whalepath-backend',
    level,
    redact: options.redact ?? [
      'req.headers.authorization',
      'password',
      'secret',
      'API_SECRET_KEY',
      'BIRDEYE_API_KEY',
    ],
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (isDev && !isTest) {
    pinoConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }

  return pino(pinoConfig);
};

export const logger: Logger = createLogger();
