import { z } from 'zod';
import { Logger } from 'pino';
import { logger as defaultLogger } from '../utils/logger';
import { QuarantinedItem, QuarantineStats, SanitizeBatchOptions } from './quarantine.types';

export type { QuarantinedItem, QuarantineStats, SanitizeBatchOptions };

/**
 * Quarantine and fault-tolerance manager ensuring invalid payloads never crash the pipeline.
 */
export class QuarantineManager {
  private readonly logger: Logger;
  private readonly maxQuarantinedItems: number;
  private readonly quarantined: QuarantinedItem[] = [];
  private totalReceived = 0;
  private totalValid = 0;
  private totalQuarantined = 0;
  private readonly reasonsCount: Record<string, number> = {};

  /**
   * Initializes QuarantineManager with injected logger and capacity bounds.
   *
   * @param options - Dependency injection configuration
   */
  public constructor(options: { logger?: Logger; maxQuarantinedItems?: number } = {}) {
    this.logger = options.logger ?? defaultLogger;
    this.maxQuarantinedItems = options.maxQuarantinedItems ?? 1000;
  }

  /**
   * Directly routes an invalid record to the quarantine pool.
   *
   * @param rawRecord - Malformed or corrupted payload
   * @param errorReason - Explanation of the validation failure
   * @param source - Pipeline origin or data source identifier
   * @param details - Additional diagnostic metadata
   * @returns Quarantined item descriptor
   */
  public quarantine(
    rawRecord: unknown,
    errorReason: string,
    source = 'pipeline',
    details?: Record<string, unknown>,
  ): QuarantinedItem {
    this.totalQuarantined++;
    this.reasonsCount[errorReason] = (this.reasonsCount[errorReason] ?? 0) + 1;

    const item: QuarantinedItem = {
      id: `quarantine-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      source,
      rawRecord,
      errorReason,
      details,
    };

    if (this.quarantined.length >= this.maxQuarantinedItems) {
      this.quarantined.shift();
    }
    this.quarantined.push(item);

    this.logger.warn(
      { source, errorReason, details },
      'Payload quarantined due to validation error',
    );
    return item;
  }

  /**
   * Sanitizes a single record against a Zod schema without throwing exceptions.
   *
   * @param raw - Candidate record
   * @param schema - Target Zod validation schema
   * @param source - Pipeline data source
   * @returns Validated record or null if quarantined
   */
  public sanitizeRecord<T, D extends z.ZodTypeDef = z.ZodTypeDef, I = unknown>(
    raw: unknown,
    schema: z.ZodType<T, D, I>,
    source = 'pipeline',
  ): T | null {
    this.totalReceived++;

    if (raw === null || raw === undefined) {
      this.quarantine(raw, 'Missing or null payload', source);
      return null;
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
      const errorReason = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('; ');
      this.quarantine(raw, errorReason, source, { issues: result.error.issues });
      return null;
    }

    this.totalValid++;
    return result.data;
  }

  /**
   * Sanitizes an array of records, dropping invalid payloads, deduplicating, and sorting.
   *
   * @param records - Candidate record batch
   * @param schema - Target Zod validation schema
   * @param options - Deduplication and chronological sorting configuration
   * @returns Clean array of validated records
   */
  public sanitizeBatch<T, D extends z.ZodTypeDef = z.ZodTypeDef, I = unknown>(
    records: unknown[],
    schema: z.ZodType<T, D, I>,
    options: SanitizeBatchOptions<T> = {},
  ): T[] {
    const source = options.source ?? 'batch';

    if (!Array.isArray(records)) {
      this.quarantine(records, 'Input payload is not an array', source);
      return [];
    }

    const validItems: T[] = [];
    const seenKeys = new Set<string>();

    for (const record of records) {
      const sanitized = this.sanitizeRecord(record, schema, source);
      if (sanitized === null) {
        continue;
      }

      if (options.deduplicateBy) {
        const key = options.deduplicateBy(sanitized);
        if (seenKeys.has(key)) {
          this.quarantine(sanitized, `Duplicate record detected: ${key}`, source);
          continue;
        }
        seenKeys.add(key);
      }

      validItems.push(sanitized);
    }

    if (options.sortByTimestamp) {
      if (typeof options.sortByTimestamp === 'function') {
        validItems.sort(options.sortByTimestamp);
      } else {
        validItems.sort((a, b) => {
          const tA = (a as { timestamp?: number }).timestamp ?? 0;
          const tB = (b as { timestamp?: number }).timestamp ?? 0;
          return tA - tB;
        });
      }
    }

    return validItems;
  }

  /**
   * Retrieves current pipeline quarantine and processing counters.
   *
   * @returns Snapshot of quarantine metrics
   */
  public getStats(): QuarantineStats {
    return {
      totalReceived: this.totalReceived,
      totalValid: this.totalValid,
      totalQuarantined: this.totalQuarantined,
      quarantineReasons: { ...this.reasonsCount },
    };
  }

  /**
   * Returns current buffer of quarantined items.
   *
   * @returns Quarantined records list
   */
  public getQuarantinedRecords(): QuarantinedItem[] {
    return [...this.quarantined];
  }

  /**
   * Resets all counters and clears the quarantine record pool.
   */
  public clear(): void {
    this.quarantined.length = 0;
    this.totalReceived = 0;
    this.totalValid = 0;
    this.totalQuarantined = 0;
    for (const key of Object.keys(this.reasonsCount)) {
      delete this.reasonsCount[key];
    }
  }
}
