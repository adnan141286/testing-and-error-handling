import {
  AppError,
  ValidationError,
  RateLimitError,
  ProviderError,
  CircuitOpenError,
  NotFoundError,
} from '../../src/errors';
import { HTTP_STATUS, ERROR_CODES } from '../../src/config/constants';

describe('Error Hierarchy and Serialization', (): void => {
  describe('AppError', (): void => {
    it('should initialize with default values', (): void => {
      const error = new AppError('Internal failure');
      expect(error.message).toBe('Internal failure');
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(error.code).toBe(ERROR_CODES.APP_ERROR);
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should serialize correctly to JSON with and without details', (): void => {
      const errorWithoutDetails = new AppError(
        'Basic error',
        HTTP_STATUS.BAD_REQUEST,
        'CUSTOM_CODE',
      );
      expect(errorWithoutDetails.toJSON()).toEqual({
        name: 'AppError',
        message: 'Basic error',
        code: 'CUSTOM_CODE',
        statusCode: 400,
        isOperational: true,
      });

      const errorWithDetails = new AppError(
        'Detailed error',
        HTTP_STATUS.BAD_REQUEST,
        'DETAILED_CODE',
        true,
        { field: 'wallet' },
      );
      expect(errorWithDetails.toJSON()).toEqual({
        name: 'AppError',
        message: 'Detailed error',
        code: 'DETAILED_CODE',
        statusCode: 400,
        isOperational: true,
        details: { field: 'wallet' },
      });
    });
  });

  describe('ValidationError', (): void => {
    it('should initialize with default message and status 400', (): void => {
      const error = new ValidationError();
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error instanceof AppError).toBe(true);
    });

    it('should accept custom message and details', (): void => {
      const details = [{ field: 'address', message: 'Invalid address' }];
      const error = new ValidationError('Custom validation error', details);
      expect(error.message).toBe('Custom validation error');
      expect(error.details).toEqual(details);
    });
  });

  describe('RateLimitError', (): void => {
    it('should initialize with default values and status 429', (): void => {
      const error = new RateLimitError();
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(error.code).toBe(ERROR_CODES.RATE_LIMIT_ERROR);
      expect(error.retryAfterSeconds).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should include retryAfterSeconds in properties and details', (): void => {
      const error = new RateLimitError('Too many RPC calls', 60);
      expect(error.message).toBe('Too many RPC calls');
      expect(error.retryAfterSeconds).toBe(60);
      expect(error.details).toEqual({ retryAfterSeconds: 60, retryAfter: 60 });
    });

    it('should derive effective seconds from numeric retryAfter', (): void => {
      const error = new RateLimitError('Wait a moment', undefined, 120);
      expect(error.retryAfterSeconds).toBe(120);
      expect(error.retryAfter).toBe(120);
    });
  });

  describe('ProviderError', (): void => {
    it('should initialize with provider name and default status 502', (): void => {
      const error = new ProviderError('dexscreener', 'Provider failed');
      expect(error.provider).toBe('dexscreener');
      expect(error.message).toBe('Provider failed');
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_GATEWAY);
      expect(error.code).toBe(ERROR_CODES.PROVIDER_ERROR);
      expect(error.originalError).toBeUndefined();
    });

    it('should initialize with provider name and custom original error', (): void => {
      const rawErr = new Error('RPC connection timeout');
      const error = new ProviderError('dexscreener', 'Failed to fetch pair', 504, rawErr);

      expect(error.provider).toBe('dexscreener');
      expect(error.message).toBe('Failed to fetch pair');
      expect(error.statusCode).toBe(HTTP_STATUS.GATEWAY_TIMEOUT);
      expect(error.code).toBe(ERROR_CODES.PROVIDER_ERROR);
      expect(error.originalError).toBe(rawErr);
      expect(error.details).toEqual({ provider: 'dexscreener', originalError: rawErr });
    });
  });

  describe('CircuitOpenError', (): void => {
    it('should generate default message and status 503', (): void => {
      const error = new CircuitOpenError('birdeye', undefined, 15000);
      expect(error.serviceName).toBe('birdeye');
      expect(error.message).toContain("Circuit breaker for service 'birdeye' is OPEN");
      expect(error.statusCode).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      expect(error.code).toBe(ERROR_CODES.CIRCUIT_OPEN_ERROR);
      expect(error.resetTimeMs).toBe(15000);
    });

    it('should allow custom message override', (): void => {
      const error = new CircuitOpenError('goplus', 'Custom circuit alert');
      expect(error.message).toBe('Custom circuit alert');
    });
  });

  describe('NotFoundError', (): void => {
    it('should handle default resource not found', (): void => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
      expect(error.code).toBe(ERROR_CODES.NOT_FOUND_ERROR);
    });

    it('should format message with identifier', (): void => {
      const error = new NotFoundError('Wallet', '0xabc123');
      expect(error.message).toBe("Wallet with identifier '0xabc123' not found");
      expect(error.resource).toBe('Wallet');
      expect(error.identifier).toBe('0xabc123');
    });

    it('should allow custom override message', (): void => {
      const error = new NotFoundError('Token', '0xxyz', 'Direct custom not found message');
      expect(error.message).toBe('Direct custom not found message');
    });
  });
});
