export class RateLimiter {
  private executions: Map<string, number[]> = new Map();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number = 5, windowMs: number = 1000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(ruleId: string): boolean {
    const now = Date.now();
    const timestamps = this.executions.get(ruleId) || [];

    // Filter out timestamps older than the window
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.limit) {
      return false;
    }

    validTimestamps.push(now);
    this.executions.set(ruleId, validTimestamps);
    return true;
  }

  reset(ruleId: string) {
    this.executions.delete(ruleId);
  }
}
