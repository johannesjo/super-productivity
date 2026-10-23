import { WebDavRequestBudget } from './webdav-request-budget';

describe('WebDavRequestBudget', () => {
  const origin = 'https://files.example';
  let now: number;
  let waits: number[];
  let budget: WebDavRequestBudget;

  beforeEach(() => {
    now = 0;
    waits = [];
    budget = new WebDavRequestBudget(
      () => now,
      async (milliseconds) => {
        waits.push(milliseconds);
        now += milliseconds;
      },
    );
  });

  it('does not delay ordinary requests without a lease', async () => {
    for (let index = 0; index < 40; index++) await budget.before(origin);
    expect(waits).toEqual([]);
  });

  it('coordinates concurrent request starts and caps the initial burst at two', async () => {
    const release = budget.acquire(origin);
    await budget.before(origin);
    await budget.before(origin);
    expect(now).toBe(0);
    await Promise.all(Array.from({ length: 3 }, () => budget.before(origin)));
    expect(waits).toEqual([6000, 6000, 6000]);
    expect(now).toBe(18000);
    release();
  });

  it('does not accumulate a new burst while an inactive window was suspended', async () => {
    const release = budget.acquire(origin);
    await budget.before(origin);
    await budget.before(origin);
    now = 600000;
    const starts: number[] = [];
    for (let index = 0; index < 4; index++) {
      await budget.before(origin);
      starts.push(now);
    }
    expect(starts).toEqual([600000, 600000, 606000, 612000]);
    release();
  });

  it('keeps the token history between scopes and leaves ordinary requests unpaced', async () => {
    const release = budget.acquire(origin);
    await budget.before(origin);
    await budget.before(origin);
    release();
    await budget.before(origin);
    expect(waits).toEqual([]);
    const releaseAgain = budget.acquire(origin);
    await budget.before(origin);
    expect(waits).toEqual([6000]);
    releaseAgain();
  });

  it('does not release a shared origin while another scope still owns it', async () => {
    const first = budget.acquire(origin);
    const second = budget.acquire(origin);
    await budget.before(origin);
    await budget.before(origin);
    first();
    first();
    await budget.before(origin);
    expect(waits).toEqual([6000]);
    second();
  });

  it('paces each provider origin separately when sync and attachment hosts differ', async () => {
    const release = budget.acquire(origin);
    await budget.before(origin);
    await budget.before(origin);
    await budget.before('https://other.example');
    await budget.before('https://other.example');
    expect(waits).toEqual([]);
    await budget.before('https://other.example');
    expect(waits).toEqual([6000]);
    release();
  });

  it('honours Retry-After without retrying the failed request', async () => {
    const release = budget.acquire(origin);
    await budget.before(origin);
    budget.response(
      origin,
      new Response(null, { status: 429, headers: new Headers([['Retry-After', '12']]) }),
    );
    await expectAsync(budget.before(origin)).toBeRejected();
    expect(waits).toEqual([]);
    now += 12000;
    await budget.before(origin);
    expect(waits).toEqual([]);
    release();
  });

  it('uses a minute cooldown for 503 without a valid Retry-After', async () => {
    const release = budget.acquire(origin);
    budget.response(
      origin,
      new Response(null, {
        status: 503,
        headers: new Headers([['Retry-After', 'invalid']]),
      }),
    );
    await expectAsync(budget.before(origin)).toBeRejected();
    release();
    await expectAsync(budget.before(origin)).toBeRejected();
    now += 60000;
    await budget.before(origin);
    expect(waits).toEqual([]);
  });

  it('accepts an HTTP-date Retry-After', async () => {
    const release = budget.acquire(origin);
    budget.response(
      origin,
      new Response(null, {
        status: 503,
        headers: new Headers([['Retry-After', new Date(18000).toUTCString()]]),
      }),
    );
    await expectAsync(budget.before(origin)).toBeRejected();
    now += 18000;
    await budget.before(origin);
    expect(waits).toEqual([]);
    release();
  });

  it('does not parse malformed numeric Retry-After as a date in the past', async () => {
    for (const header of ['-1', '1.5', '2026-10-23']) {
      now = Date.now();
      const local = new WebDavRequestBudget(() => now);
      const release = local.acquire(origin);
      local.response(
        origin,
        new Response(null, {
          status: 429,
          headers: new Headers([['Retry-After', header]]),
        }),
      );
      await expectAsync(local.before(origin)).toBeRejected();
      release();
    }
  });

  for (const [format, header] of [
    ['rfc850', 'Friday, 23-Oct-26 00:02:00 GMT'],
    ['asctime', 'Fri Oct 23 00:02:00 2026'],
  ]) {
    it(`honours the full future Retry-After in obsolete ${format} HTTP-date format`, async () => {
      now = Date.parse('2026-10-23T00:00:00Z');
      const release = budget.acquire(origin);
      budget.response(
        origin,
        new Response(null, {
          status: 429,
          headers: new Headers([['Retry-After', header]]),
        }),
      );
      now += 119999;
      await expectAsync(budget.before(origin)).toBeRejected();
      now++;
      await budget.before(origin);
      release();
    });
  }

  it('rejects an aborted waiter without consuming its token or breaking the queue', async () => {
    const release = budget.acquire(origin);
    await budget.before(origin);
    await budget.before(origin);
    const controller = new AbortController();
    controller.abort();
    await expectAsync(budget.before(origin, controller.signal)).toBeRejected();
    await budget.before(origin);
    expect(waits).toEqual([6000]);
    release();
  });

  it('keeps an already queued request paced after its scope is released', async () => {
    let resume!: () => void;
    budget = new WebDavRequestBudget(
      () => now,
      async (milliseconds) => {
        await new Promise<void>((resolve) => (resume = resolve));
        now += milliseconds;
      },
    );
    const release = budget.acquire(origin);
    await budget.before(origin);
    await budget.before(origin);
    const pending = budget.before(origin);
    await Promise.resolve();
    release();
    const releaseAgain = budget.acquire(origin);
    expect(now).toBe(0);
    resume();
    await pending;
    expect(now).toBe(6000);
    releaseAgain();
  });
});
