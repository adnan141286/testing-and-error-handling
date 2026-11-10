import { PriceSamplerService } from './priceSampler.service';
import { getDbPool } from '../../utils/db';

export * from './priceSampler.service';

let instance: PriceSamplerService | null = null;

/**
 * Returns the singleton PriceSamplerService instance.
 *
 * @param overrideInstance - Optional instance to inject for testing
 * @returns Active PriceSamplerService
 */
export function getPriceSampler(overrideInstance?: PriceSamplerService): PriceSamplerService {
  if (overrideInstance) {
    instance = overrideInstance;
    return instance;
  }
  if (!instance) {
    instance = new PriceSamplerService({
      pool: getDbPool(),
      intervalMs: 15000,
    });
  }
  return instance;
}

/**
 * Resets the singleton instance (used in tests).
 */
export function resetPriceSampler(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
