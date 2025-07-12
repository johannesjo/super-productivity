// Reusable debouncing utility - easily testable
export class Debouncer {
  private timers = new Map<string, number>();

  /**
   * Debounce a function call with a given key and delay
   */
  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number,
    ...args: Parameters<T>
  ): void {
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // Set new timer
    const timerId = window.setTimeout(() => {
      this.timers.delete(key);
      try {
        fn(...args);
      } catch (error) {
        console.error(`Error in debounced function ${key}:`, error);
      }
    }, delay);

    this.timers.set(key, timerId);
  }

  /**
   * Cancel a pending debounced call
   */
  cancel(key: string): void {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
  }

  /**
   * Cancel all pending calls
   */
  cancelAll(): void {
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId);
    }
    this.timers.clear();
  }

  /**
   * Check if a debounced call is pending
   */
  isPending(key: string): boolean {
    return this.timers.has(key);
  }

  /**
   * Get the number of pending calls
   */
  getPendingCount(): number {
    return this.timers.size;
  }
}
