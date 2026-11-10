/**
 * Representation of an event log entry in the system.
 */
export interface EventLogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  level?: 'info' | 'warn' | 'error';
  details?: unknown;
}

/**
 * In-memory FIFO event log store capturing recent system activities.
 */
export class EventLogTracker {
  private readonly events: EventLogEntry[] = [];
  private readonly maxEvents: number;

  /**
   * Initializes the event log tracker.
   *
   * @param maxEvents - Maximum number of recent events to retain
   */
  public constructor(maxEvents = 200) {
    this.maxEvents = maxEvents;
  }

  /**
   * Records a new event in the FIFO buffer.
   *
   * @param type - Category or event identifier
   * @param message - Human-readable description
   * @param details - Optional contextual metadata
   * @param level - Severity level
   * @returns Created event entry
   */
  public addEvent(
    type: string,
    message: string,
    details?: unknown,
    level: 'info' | 'warn' | 'error' = 'info',
  ): EventLogEntry {
    const entry: EventLogEntry = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      level,
      details,
    };

    if (this.events.length >= this.maxEvents) {
      this.events.shift();
    }
    this.events.push(entry);
    return entry;
  }

  /**
   * Retrieves the most recent events up to the specified limit.
   *
   * @param limit - Maximum items to retrieve
   * @returns Array of events sorted newest first
   */
  public getEvents(limit = 200): EventLogEntry[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Clears all recorded events from the buffer.
   */
  public clear(): void {
    this.events.length = 0;
  }
}

export const eventLogger = new EventLogTracker(200);
