import { logger, createLogger } from '../../src/utils/logger';
import { validateEnv } from '../../src/config/env';

describe('Logger Utility', (): void => {
  it('should export a default logger instance with standard logging functions', (): void => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should support creating a custom logger via dependency injection', (): void => {
    const customConfig = validateEnv({
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    });

    const customLogger = createLogger(
      {
        name: 'test-custom-logger',
        level: 'info',
        redact: ['secretToken'],
      },
      customConfig,
    );

    expect(customLogger).toBeDefined();
    expect(customLogger.level).toBe('info');
  });

  it('should configure development transport when NODE_ENV is development', (): void => {
    const devConfig = validateEnv({
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug',
    });

    const devLogger = createLogger({}, devConfig);
    expect(devLogger).toBeDefined();
    expect(devLogger.level).toBe('debug');
  });
});
