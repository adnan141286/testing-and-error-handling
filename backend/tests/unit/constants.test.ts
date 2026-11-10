import {
  HTTP_STATUS,
  ERROR_CODES,
  PROVIDERS,
  CIRCUIT_BREAKER_STATES,
  CACHE_KEY_PREFIXES,
  PAGINATION,
} from '../../src/config/constants';

describe('Application Constants', (): void => {
  it('should define valid HTTP status codes', (): void => {
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
    expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    expect(HTTP_STATUS.BAD_GATEWAY).toBe(502);
    expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
  });

  it('should define standard error codes', (): void => {
    expect(ERROR_CODES.APP_ERROR).toBe('APP_ERROR');
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.RATE_LIMIT_ERROR).toBe('RATE_LIMIT_ERROR');
    expect(ERROR_CODES.PROVIDER_ERROR).toBe('PROVIDER_ERROR');
    expect(ERROR_CODES.CIRCUIT_OPEN_ERROR).toBe('CIRCUIT_OPEN_ERROR');
    expect(ERROR_CODES.NOT_FOUND_ERROR).toBe('NOT_FOUND_ERROR');
  });

  it('should define external data providers', (): void => {
    expect(PROVIDERS.DEXSCREENER).toBe('dexscreener');
    expect(PROVIDERS.BIRDEYE).toBe('birdeye');
    expect(PROVIDERS.GOPLUS).toBe('goplus');
  });

  it('should define circuit breaker states', (): void => {
    expect(CIRCUIT_BREAKER_STATES.CLOSED).toBe('CLOSED');
    expect(CIRCUIT_BREAKER_STATES.OPEN).toBe('OPEN');
    expect(CIRCUIT_BREAKER_STATES.HALF_OPEN).toBe('HALF_OPEN');
  });

  it('should define cache key prefixes and pagination defaults', (): void => {
    expect(CACHE_KEY_PREFIXES.TOKEN_METRICS).toBe('token:metrics:');
    expect(CACHE_KEY_PREFIXES.PRICE).toBe('token:price:');
    expect(CACHE_KEY_PREFIXES.SECURITY).toBe('token:security:');
    expect(CACHE_KEY_PREFIXES.WALLET).toBe('wallet:analysis:');

    expect(PAGINATION.DEFAULT_PAGE).toBe(1);
    expect(PAGINATION.DEFAULT_LIMIT).toBe(20);
    expect(PAGINATION.MAX_LIMIT).toBe(100);
  });
});
