/**
 * HTTP Status Codes used throughout the Whalepath platform.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

/**
 * Standard Error Codes for application error responses.
 */
export const ERROR_CODES = {
  APP_ERROR: 'APP_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  CIRCUIT_OPEN_ERROR: 'CIRCUIT_OPEN_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Supported third-party blockchain and market data providers.
 */
export const PROVIDERS = {
  DEXSCREENER: 'dexscreener',
  BIRDEYE: 'birdeye',
  GOPLUS: 'goplus',
  COINGECKO: 'coingecko',
  ETH_RPC: 'eth_rpc',
} as const;

export type ProviderName = (typeof PROVIDERS)[keyof typeof PROVIDERS];

/**
 * Circuit breaker state transitions.
 */
export const CIRCUIT_BREAKER_STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
} as const;

export type CircuitBreakerState =
  (typeof CIRCUIT_BREAKER_STATES)[keyof typeof CIRCUIT_BREAKER_STATES];

/**
 * Redis cache key prefixes for domain data segregation.
 */
export const CACHE_KEY_PREFIXES = {
  TOKEN_METRICS: 'token:metrics:',
  PRICE: 'token:price:',
  SECURITY: 'token:security:',
  GAS: 'network:gas:',
  WALLET: 'wallet:analysis:',
  RATE_LIMIT: 'rl:',
} as const;

export type CacheKeyPrefix = (typeof CACHE_KEY_PREFIXES)[keyof typeof CACHE_KEY_PREFIXES];

/**
 * Common pagination defaults and limits.
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
