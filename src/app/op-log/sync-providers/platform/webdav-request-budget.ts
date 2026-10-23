import { TooManyRequestsAPIError } from '@sp/sync-providers/errors';

const REFILL_MS = 6000;
const CAPACITY = 2;

interface OriginBudget {
  pending: number;
  tokens: number;
  updatedAt: number;
  blockedUntil: number;
  blockedStatus: number;
  cooldown: AbortController;
  tail: Promise<void>;
}

const waitForBudget = (milliseconds: number, signal?: AbortSignal): Promise<void> => {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
  });
};

/**
 * Opt-in request starts, shared by WebDAV sync and a plugin's raw file fetch.
 * This does not coordinate other clients, origins, native HTTP or CORS OPTIONS.
 */
export class WebDavRequestBudget {
  private readonly _origins = new Map<string, OriginBudget>();
  private _leases = 0;

  constructor(
    private readonly _now: () => number = () => Date.now(),
    private readonly _wait: (
      milliseconds: number,
      signal?: AbortSignal,
    ) => Promise<void> = waitForBudget,
  ) {}

  acquire(url: string): () => void {
    this._state(new URL(url).origin);
    this._leases++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this._leases--;
    };
  }

  private _state(origin: string): OriginBudget {
    let state = this._origins.get(origin);
    if (!state) {
      state = {
        pending: 0,
        tokens: CAPACITY,
        updatedAt: this._now(),
        blockedUntil: 0,
        blockedStatus: 429,
        cooldown: new AbortController(),
        tail: Promise.resolve(),
      };
      this._origins.set(origin, state);
    }
    return state;
  }

  before(url: string, signal?: AbortSignal): Promise<void> {
    return this._admit(url, signal, () => {});
  }

  async run<T>(url: string, start: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    let operation!: Promise<T>;
    await this._admit(url, signal, () => {
      operation = start();
    });
    return operation;
  }

  private async _admit(
    url: string,
    signal: AbortSignal | undefined,
    start: () => void,
  ): Promise<void> {
    signal?.throwIfAborted();
    const origin = new URL(url).origin;
    const state = this._leases > 0 ? this._state(origin) : this._origins.get(origin);
    if (!state) {
      start();
      return;
    }
    this._assertNotCoolingDown(state);
    if (this._leases === 0 && state.pending === 0) {
      start();
      return;
    }
    state.pending++;
    let admitted = false;
    const current = state.tail.then(async () => {
      for (;;) {
        signal?.throwIfAborted();
        this._assertNotCoolingDown(state);
        const now = this._now();
        const refilled = (now - state.updatedAt) / REFILL_MS;
        state.tokens = Math.min(CAPACITY, state.tokens + refilled);
        state.updatedAt = now;
        const milliseconds =
          state.tokens >= 1 ? 0 : Math.ceil((1 - state.tokens) * REFILL_MS);
        if (milliseconds <= 0) {
          state.tokens--;
          // Start the actual fetch before the next admission can refill tokens.
          admitted = true;
          start();
          return;
        }
        const waitSignal = signal
          ? AbortSignal.any([signal, state.cooldown.signal])
          : state.cooldown.signal;
        try {
          await this._wait(milliseconds, waitSignal);
        } catch (error) {
          signal?.throwIfAborted();
          this._assertNotCoolingDown(state);
          throw error;
        }
      }
    });
    const tracked = current.finally(() => {
      state.pending--;
    });
    state.tail = tracked.catch(() => {});
    if (!signal) return tracked;
    // Caller cancellation must not wait for an unsignalled provider ahead of it.
    // Keep the real queue entry tracked until it reaches the head and skips start.
    return new Promise<void>((resolve, reject) => {
      const abort = (): void => {
        if (!admitted) reject(signal.reason);
      };
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      void tracked.then(resolve, reject).finally(() => {
        signal.removeEventListener('abort', abort);
      });
    });
  }

  response(url: string, response: Response): void {
    if (response.status !== 429 && response.status !== 503) return;
    const state = this._origins.get(new URL(url).origin);
    if (!state) return;
    const now = this._now();
    const header = response.headers.get('Retry-After')?.trim();
    let delay = 60000;
    if (header && /^\d+$/.test(header)) {
      const seconds = Number(header);
      if (Number.isFinite(seconds)) delay = seconds * 1000;
    } else if (header && /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*(?:,| )/.test(header)) {
      // The asctime HTTP-date omits a zone but still denotes GMT, not local time.
      const date = Date.parse(header.includes(',') ? header : `${header} GMT`);
      if (Number.isFinite(date)) delay = Math.max(0, date - now);
    }
    state.blockedUntil = Math.max(state.blockedUntil, now + delay);
    state.blockedStatus = response.status;
    const previous = state.cooldown;
    state.cooldown = new AbortController();
    previous.abort();
  }

  private _assertNotCoolingDown(state: OriginBudget): void {
    const remaining = state.blockedUntil - this._now();
    if (remaining > 0)
      throw new TooManyRequestsAPIError({
        status: state.blockedStatus,
        retryAfter: Math.ceil(remaining / 1000),
      });
  }
}

export const WEBDAV_REQUEST_BUDGET = new WebDavRequestBudget();
