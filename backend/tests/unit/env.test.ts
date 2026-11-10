import { validateEnv } from '../../src/config/env';

describe('Environment Configuration Validator', (): void => {
  it('should successfully validate a complete valid environment configuration', (): void => {
    const validConfig = validateEnv({
      NODE_ENV: 'test',
      PORT: '4000',
      HOST: '127.0.0.1',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/whalepath_test',
      REDIS_URL: 'redis://localhost:6379',
      DEXSCREENER_BASE_URL: 'https://api.dexscreener.com',
      DEXSCREENER_API_KEY: 'test_key',
      BIRDEYE_BASE_URL: 'https://public-api.birdeye.so',
      BIRDEYE_API_KEY: 'test_birdeye_key',
      GOPLUS_BASE_URL: 'https://api.gopluslabs.io',
      COINGECKO_BASE_URL: 'https://api.coingecko.com/api/v3',
      ETH_RPC_URL: 'https://ethereum-rpc.publicnode.com',
      RATE_LIMIT_WINDOW_MS: '30000',
      RATE_LIMIT_MAX_REQUESTS: '50',
      DEXSCREENER_RATE_LIMIT_RPS: '20',
      BIRDEYE_RATE_LIMIT_RPS: '10',
      GOPLUS_RATE_LIMIT_RPS: '25',
      MAX_RETRIES: '5',
      RETRY_BASE_DELAY_MS: '500',
      RETRY_MAX_DELAY_MS: '5000',
      CIRCUIT_BREAKER_TIMEOUT_MS: '3000',
      CIRCUIT_BREAKER_RESET_TIMEOUT_MS: '15000',
      CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE: '60',
      CACHE_TTL_DEFAULT_SECONDS: '600',
      CACHE_TTL_TOKEN_METRICS_SECONDS: '120',
      CACHE_TTL_PRICE_SECONDS: '30',
      CACHE_TTL_SECURITY_INFO_SECONDS: '7200',
      API_SECRET_KEY: 'super_secret_test_key_with_sufficient_length',
    });

    expect(validConfig.NODE_ENV).toBe('test');
    expect(validConfig.PORT).toBe(4000);
    expect(validConfig.MAX_RETRIES).toBe(5);
    expect(validConfig.DEXSCREENER_BASE_URL).toBe('https://api.dexscreener.com');
    expect(validConfig.BIRDEYE_BASE_URL).toBe('https://public-api.birdeye.so');
    expect(validConfig.GOPLUS_BASE_URL).toBe('https://api.gopluslabs.io');
    expect(validConfig.COINGECKO_BASE_URL).toBe('https://api.coingecko.com/api/v3');
    expect(validConfig.ETH_RPC_URL).toBe('https://ethereum-rpc.publicnode.com');
    expect(validConfig.CACHE_TTL_DEFAULT_SECONDS).toBe(600);
  });

  it('should validate using default process.env when no arguments provided', (): void => {
    const defaultConfig = validateEnv();
    expect(defaultConfig).toBeDefined();
    expect(defaultConfig.PORT).toBeGreaterThan(0);
    expect(defaultConfig.BIRDEYE_BASE_URL).toBeDefined();
    expect(defaultConfig.MAX_RETRIES).toBeDefined();
    expect(defaultConfig.CORS_ORIGIN).toBeDefined();
  });

  it('should parse custom CORS_ORIGIN correctly', (): void => {
    const customConfig = validateEnv({
      CORS_ORIGIN: 'http://custom-origin.com:3000',
    });
    expect(customConfig.CORS_ORIGIN).toBe('http://custom-origin.com:3000');
  });

  it('should reject invalid base URLs', (): void => {
    expect((): void => {
      validateEnv({
        DEXSCREENER_BASE_URL: 'not-a-valid-url',
      });
    }).toThrow('Environment validation error');
  });

  it('should reject invalid port numbers', (): void => {
    expect((): void => {
      validateEnv({
        PORT: 'invalid_port',
      });
    }).toThrow('Environment validation error');
  });

  it('should reject short secret keys', (): void => {
    expect((): void => {
      validateEnv({
        API_SECRET_KEY: 'short',
      });
    }).toThrow('Environment validation error');
  });
});
