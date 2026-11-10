import { Pool } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let poolInstance: Pool | null = null;

/**
 * Returns a singleton PostgreSQL connection pool instance.
 *
 * @param connectionString - Optional connection URI override
 * @returns Connected pg.Pool instance
 */
export function getDbPool(connectionString?: string): Pool {
  if (!poolInstance) {
    const connStr = connectionString ?? env.DATABASE_URL;
    poolInstance = new Pool({
      connectionString: connStr,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    poolInstance.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
    });
  }
  return poolInstance;
}

/**
 * Ensures the token_price_history table and index exist in the database.
 *
 * @param pool - pg.Pool instance
 */
export async function initDbSchema(pool: Pool = getDbPool()): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_price_history (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) NOT NULL,
        price NUMERIC NOT NULL,
        liquidity NUMERIC NOT NULL,
        source VARCHAR(50) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_token_history_sym_time 
      ON token_price_history(symbol, timestamp DESC);
    `);
    logger.info('PostgreSQL token_price_history schema verified');
  } catch (err) {
    logger.warn({ err }, 'PostgreSQL token_price_history table init skipped (offline/unreachable)');
  }
}

/**
 * Closes the database pool if active.
 */
export async function closeDbPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}
