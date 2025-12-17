/**
 * Handles batched accumulation and flushing of time tracking data.
 * Used by TaskService and SimpleCounterService to reduce sync frequency.
 */
export class BatchedTimeSyncAccumulator {
  private _unsyncedDuration = new Map<string, { duration: number; date: string }>();
  private _lastSyncTime = Date.now();

  constructor(
    private readonly _syncIntervalMs: number,
    private readonly _dispatchSync: (id: string, date: string, duration: number) => void,
  ) {}

  /**
   * Accumulates duration for an entity. Flushes old data if date changes.
   */
  accumulate(id: string, duration: number, date: string): void {
    const existing = this._unsyncedDuration.get(id);
    if (existing && existing.date === date) {
      existing.duration += duration;
    } else {
      if (existing && existing.duration > 0) {
        this._dispatchSync(id, existing.date, existing.duration);
      }
      this._unsyncedDuration.set(id, { duration, date });
    }
  }

  /**
   * Returns true if enough time has passed since last sync.
   */
  shouldFlush(): boolean {
    return Date.now() - this._lastSyncTime >= this._syncIntervalMs;
  }

  /**
   * Flushes all accumulated time and resets.
   */
  flush(): void {
    this._unsyncedDuration.forEach(({ duration, date }, id) => {
      if (duration > 0) {
        this._dispatchSync(id, date, duration);
      }
    });
    this._unsyncedDuration.clear();
    this._lastSyncTime = Date.now();
  }

  /**
   * Flushes a specific entity (e.g., when stopwatch stops).
   */
  flushOne(id: string): void {
    const accumulated = this._unsyncedDuration.get(id);
    if (accumulated && accumulated.duration > 0) {
      this._dispatchSync(id, accumulated.date, accumulated.duration);
      this._unsyncedDuration.delete(id);
    }
  }

  /**
   * Resets last sync time (call after flushing secondary data).
   */
  resetSyncTime(): void {
    this._lastSyncTime = Date.now();
  }
}
