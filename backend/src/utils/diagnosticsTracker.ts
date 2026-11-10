/**
 * Global diagnostics metrics collector for runtime telemetry.
 */
export interface DiagnosticsMetrics {
  cacheHits: number;
  cacheMisses: number;
  latencies: Record<string, { lastMs: number; avgMs: number; count: number }>;
}

class DiagnosticsTracker {
  private cacheHits = 0;
  private cacheMisses = 0;
  private latencyMap: Map<string, { totalMs: number; count: number; lastMs: number }> = new Map();

  public recordCacheHit(): void {
    this.cacheHits++;
  }

  public recordCacheMiss(): void {
    this.cacheMisses++;
  }

  public recordLatency(provider: string, durationMs: number): void {
    const current = this.latencyMap.get(provider) ?? { totalMs: 0, count: 0, lastMs: 0 };
    current.totalMs += durationMs;
    current.count += 1;
    current.lastMs = durationMs;
    this.latencyMap.set(provider, current);
  }

  public getMetrics(): DiagnosticsMetrics {
    const latencies: Record<string, { lastMs: number; avgMs: number; count: number }> = {};
    for (const [provider, stats] of this.latencyMap.entries()) {
      latencies[provider] = {
        lastMs: stats.lastMs,
        avgMs: stats.count > 0 ? Math.round(stats.totalMs / stats.count) : 0,
        count: stats.count,
      };
    }

    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      latencies,
    };
  }

  public reset(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.latencyMap.clear();
  }
}

export const diagnosticsTracker = new DiagnosticsTracker();
