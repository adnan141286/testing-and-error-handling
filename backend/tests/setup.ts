/**
 * Global test environment setup for Jest.
 * Initializes default test environment variables and configures cleanup hooks.
 */

// Set test environment variables before modules are evaluated
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3000';
process.env['HOST'] = '127.0.0.1';
process.env['LOG_LEVEL'] = 'silent';
process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/whalepath_test';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['REDIS_USE_IN_MEMORY_FALLBACK'] = 'true';

// Third-Party Providers
process.env['DEXSCREENER_BASE_URL'] = 'https://api.dexscreener.com';
process.env['DEXSCREENER_API_KEY'] = 'test_dexscreener_key';
process.env['BIRDEYE_BASE_URL'] = 'https://public-api.birdeye.so';
process.env['BIRDEYE_API_KEY'] = 'test_birdeye_key';
process.env['GOPLUS_BASE_URL'] = 'https://api.gopluslabs.io';
process.env['GOPLUS_API_KEY'] = 'test_goplus_key';

// Rate Limits
process.env['RATE_LIMIT_WINDOW_MS'] = '60000';
process.env['RATE_LIMIT_MAX_REQUESTS'] = '100';
process.env['DEXSCREENER_RATE_LIMIT_RPS'] = '30';
process.env['BIRDEYE_RATE_LIMIT_RPS'] = '15';
process.env['GOPLUS_RATE_LIMIT_RPS'] = '30';

// Resilience & Retries
process.env['MAX_RETRIES'] = '3';
process.env['RETRY_BASE_DELAY_MS'] = '100';
process.env['RETRY_MAX_DELAY_MS'] = '1000';
process.env['CIRCUIT_BREAKER_TIMEOUT_MS'] = '2000';
process.env['CIRCUIT_BREAKER_RESET_TIMEOUT_MS'] = '5000';
process.env['CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE'] = '50';

// Cache TTLs
process.env['CACHE_TTL_DEFAULT_SECONDS'] = '300';
process.env['CACHE_TTL_TOKEN_METRICS_SECONDS'] = '60';
process.env['CACHE_TTL_PRICE_SECONDS'] = '15';
process.env['CACHE_TTL_SECURITY_INFO_SECONDS'] = '3600';

// Auth
process.env['API_SECRET_KEY'] = 'test_secret_key_minimum_32_characters_long';
process.env['LAB_MODE'] = 'true';

/**
 * Global cleanup after each test.
 */
afterEach((): void => {
  jest.clearAllMocks();
});

/**
 * Global teardown after all test suites complete.
 */
afterAll((): void => {
  jest.restoreAllMocks();
});

/**
 * Verifies whether test environment flags are active.
 *
 * @returns boolean True if current NODE_ENV is set to test.
 */
export const isTestEnvironmentConfigured = (): boolean => {
  return process.env['NODE_ENV'] === 'test';
};
