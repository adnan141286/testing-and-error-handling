import dotenv from 'dotenv';
import { z } from 'zod';

// Load local .env if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/whalepath'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_USE_IN_MEMORY_FALLBACK: z.coerce.boolean().default(true),

  // Third-Party Providers Base URLs and API Keys
  DEXSCREENER_BASE_URL: z.string().url().default('https://api.dexscreener.com'),
  DEXSCREENER_API_KEY: z.string().optional().default(''),
  BIRDEYE_BASE_URL: z.string().url().default('https://public-api.birdeye.so'),
  BIRDEYE_API_KEY: z.string().default('placeholder_birdeye_api_key'),
  GOPLUS_BASE_URL: z.string().url().default('https://api.gopluslabs.io'),
  GOPLUS_API_KEY: z.string().optional().default(''),
  COINGECKO_BASE_URL: z.string().url().default('https://api.coingecko.com/api/v3'),
  ETH_RPC_URL: z.string().url().default('https://ethereum-rpc.publicnode.com'),

  // Rate Limits
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  DEXSCREENER_RATE_LIMIT_RPS: z.coerce.number().int().positive().default(30),
  BIRDEYE_RATE_LIMIT_RPS: z.coerce.number().int().positive().default(1),
  GOPLUS_RATE_LIMIT_RPS: z.coerce.number().int().positive().default(30),
  COINGECKO_RATE_LIMIT_RPM: z.coerce.number().int().positive().default(10),

  // Retries & Resilience
  MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(1000),
  RETRY_MAX_DELAY_MS: z.coerce.number().int().positive().default(10000),
  CIRCUIT_BREAKER_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE: z.coerce.number().min(1).max(100).default(50),

  // Cache TTLs (in seconds)
  CACHE_TTL_DEFAULT_SECONDS: z.coerce.number().int().positive().default(300),
  CACHE_TTL_TOKEN_METRICS_SECONDS: z.coerce.number().int().positive().default(60),
  CACHE_TTL_PRICE_SECONDS: z.coerce.number().int().positive().default(15),
  CACHE_TTL_SECURITY_INFO_SECONDS: z.coerce.number().int().positive().default(3600),

  // Pair Selection & Deviation Minimums
  DEX_MIN_LIQUIDITY_USD: z.coerce.number().nonnegative().default(10000),
  DEX_MIN_VOLUME_24H_USD: z.coerce.number().nonnegative().default(10000),
  PRICE_DEVIATION_THRESHOLD_PERCENT: z.coerce.number().positive().default(1.0),

  // Auth & Security
  API_SECRET_KEY: z
    .string()
    .min(16)
    .default('whales_paper_trading_secret_key_minimum_32_characters'),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  LAB_MODE: z.coerce.boolean().default(true),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates and parses the environment variables against the schema.
 *
 * @param rawEnv - Raw environment dictionary to validate
 * @returns Validated environment configuration object
 * @throws Error if validation fails
 */
export const validateEnv = (
  rawEnv: Record<string, string | undefined> = process.env,
): EnvConfig => {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Environment validation error: ${errorDetails}`);
  }
  return result.data;
};

export const env: EnvConfig = validateEnv(process.env);
