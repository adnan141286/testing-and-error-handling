/**
 * Representation of a record that failed validation and was quarantined.
 */
export interface QuarantinedItem<T = unknown> {
  id: string;
  timestamp: number;
  source: string;
  rawRecord: T;
  errorReason: string;
  details?: Record<string, unknown>;
}

/**
 * Aggregated statistics regarding processed, valid, and quarantined records.
 */
export interface QuarantineStats {
  totalReceived: number;
  totalValid: number;
  totalQuarantined: number;
  quarantineReasons: Record<string, number>;
}

/**
 * Configuration options for batch processing and sanitation.
 */
export interface SanitizeBatchOptions<T> {
  source?: string;
  deduplicateBy?: (item: T) => string;
  sortByTimestamp?: boolean | ((a: T, b: T) => number);
}
