import http from 'http';
import request from 'supertest';
import { startServer, gracefulShutdown, registerProcessHandlers } from '../../src/server';
import { env } from '../../src/config/env';

const waitForListening = (srv: http.Server): Promise<void> => {
  return new Promise<void>((resolve) => {
    if (srv.listening) {
      resolve();
    } else {
      srv.once('listening', () => resolve());
    }
  });
};

describe('Server Lifecycle & Shutdown Integration Tests', (): void => {
  let server: http.Server | undefined;

  afterEach(async (): Promise<void> => {
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close(() => resolve());
      });
      server = undefined;
    }
  });

  it('starts HTTP server and processes incoming requests', async (): Promise<void> => {
    const testConfig = { ...env, PORT: 0 };
    server = startServer(testConfig);
    await waitForListening(server);

    expect(server).toBeDefined();
    expect(server.listening).toBe(true);

    const res = await request(server).get('/health');
    expect(res.status).toBe(200);
  });

  it('gracefully shuts down active server within timeout without exiting process', async (): Promise<void> => {
    const testConfig = { ...env, PORT: 0 };
    server = startServer(testConfig);
    await waitForListening(server);

    expect(server.listening).toBe(true);

    await gracefulShutdown(server, 'SIGTERM', { exitProcess: false, timeoutMs: 3000 });
    expect(server.listening).toBe(false);
  });

  it('handles server close errors gracefully during shutdown', async (): Promise<void> => {
    const mockServer = {
      listening: true,
      close: (cb: (err?: Error) => void) => {
        cb(new Error('Simulated socket close failure'));
      },
    } as unknown as http.Server;

    await expect(
      gracefulShutdown(mockServer, 'ERROR_TEST', { exitProcess: false, timeoutMs: 2000 }),
    ).resolves.toBeUndefined();
  });

  it('handles shutdown timeout if server.close hangs', async (): Promise<void> => {
    const hangingServer = {
      listening: true,
      close: () => {
        // Deliberately do not invoke callback to trigger timeout
      },
    } as unknown as http.Server;

    await expect(
      gracefulShutdown(hangingServer, 'TIMEOUT_TEST', { exitProcess: false, timeoutMs: 200 }),
    ).resolves.toBeUndefined();
  });

  it('registers process handlers without throwing', (): void => {
    const mockServer = {
      listening: false,
      close: (cb: () => void) => cb(),
    } as unknown as http.Server;

    expect(() => registerProcessHandlers(mockServer, false)).not.toThrow();
  });
});
