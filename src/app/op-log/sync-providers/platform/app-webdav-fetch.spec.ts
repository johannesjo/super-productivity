import { createWebdavProvider } from '../file-based/webdav/webdav';
import { createNextcloudProvider } from '../file-based/webdav/nextcloud';
import { APP_WEB_FETCH } from './app-web-fetch';
import { APP_WEBDAV_FETCH, runWithWebDavRequestBudget } from './app-webdav-fetch';
import { APP_PROVIDER_PLATFORM_INFO } from './app-provider-platform-info';

describe('WebDAV request budget through the real app factory', () => {
  let fetchSpy: jasmine.Spy<typeof fetch>;
  let origin: string;

  // Package providers retain native async functions. A real event-loop checkpoint
  // drains them; Angular fakeAsync only drains Zone-managed Promise callbacks.
  const realSetTimeout = globalThis.setTimeout.bind(globalThis);
  const settle = (): Promise<void> =>
    new Promise((resolve) => realSetTimeout(resolve, 0));

  afterEach(() => jasmine.clock().uninstall());

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-23T00:00:00Z'));
    origin = `https://budget-${crypto.randomUUID()}.example`;
    fetchSpy = spyOn(globalThis, 'fetch').and.callFake(
      async () => new Response(null, { status: 204 }),
    );
  });

  it('coordinates provider DELETEs and raw binary requests in one queue', async () => {
    const provider = createWebdavProvider();
    spyOn(provider.privateCfg, 'load').and.resolveTo({
      baseUrl: origin,
      userName: 'fixture',
      password: 'fixture',
      syncFolderPath: 'sync',
    });
    let finished = false;
    void runWithWebDavRequestBudget(origin, async (budgetFetch) => {
      await provider.removeFile('one.json');
      await budgetFetch(`${origin}/files/file.pdf`, {
        method: 'PUT',
        body: new Uint8Array([0, 255]),
      });
      await provider.removeFile('two.json');
      finished = true;
    });
    await settle();
    expect(fetchSpy.calls.count()).toBe(2);
    expect(finished).toBeFalse();
    jasmine.clock().tick(5999);
    await settle();
    expect(fetchSpy.calls.count()).toBe(2);
    jasmine.clock().tick(1);
    await settle();
    expect(fetchSpy.calls.count()).toBe(3);
    expect(finished).toBeTrue();
  });

  it('caps actual fetch starts after a clock jump between concurrent admissions', async () => {
    const starts: number[] = [];
    const resumedAt = Date.now() + 600000;
    fetchSpy.and.callFake(async () => {
      starts.push(Date.now());
      if (starts.length === 1) jasmine.clock().mockDate(new Date(resumedAt));
      return new Response(null, { status: 204 });
    });
    const pending = runWithWebDavRequestBudget(origin, async (budgetFetch) => {
      await Promise.all(
        Array.from({ length: 5 }, (_, index) => budgetFetch(`${origin}/${index}`)),
      );
    });
    await settle();
    expect(starts.filter((time) => time === resumedAt).length).toBe(2);
    jasmine.clock().tick(12000);
    await settle();
    // Each queued request computes the next refill after the preceding wakeup.
    jasmine.clock().tick(12000);
    await pending;
    expect(fetchSpy.calls.count()).toBe(5);
  });

  it('does not pace ordinary WebDAV or unrelated provider fetches', async () => {
    let finished = false;
    void (async () => {
      for (let index = 0; index < 5; index++)
        await APP_WEBDAV_FETCH()(`${origin}/sync/data`);
      await runWithWebDavRequestBudget(origin, async () => {
        for (let index = 0; index < 5; index++)
          await APP_WEB_FETCH()(`${origin}/other-provider`);
      });
      finished = true;
    })();
    await settle();
    expect(fetchSpy.calls.count()).toBe(10);
    expect(finished).toBeTrue();
  });

  it('also paces the Nextcloud factory and a different active sync origin', async () => {
    const provider = createNextcloudProvider();
    const syncOrigin = `https://sync-${crypto.randomUUID()}.example`;
    spyOn(provider.privateCfg, 'load').and.resolveTo({
      serverUrl: syncOrigin,
      userName: 'fixture',
      password: 'fixture',
    });
    let finished = false;
    void runWithWebDavRequestBudget(origin, async () => {
      await provider.removeFile('one');
      await provider.removeFile('two');
      await provider.removeFile('three');
      finished = true;
    });
    await settle();
    expect(fetchSpy.calls.count()).toBe(2);
    expect(finished).toBeFalse();
    jasmine.clock().tick(6000);
    await settle();
    expect(fetchSpy.calls.count()).toBe(3);
    expect(finished).toBeTrue();
  });

  it('refuses unsupported native HTTP before invoking the action', async () => {
    const previous = APP_PROVIDER_PLATFORM_INFO.isNativePlatform;
    const action = jasmine.createSpy('action');
    try {
      Object.defineProperty(APP_PROVIDER_PLATFORM_INFO, 'isNativePlatform', {
        value: true,
      });
      await expectAsync(runWithWebDavRequestBudget(origin, action)).toBeRejectedWithError(
        /native HTTP/,
      );
      expect(action).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(APP_PROVIDER_PLATFORM_INFO, 'isNativePlatform', {
        value: previous,
      });
    }
  });

  it('forces redirect refusal and refuses a different origin or URL credentials', async () => {
    await runWithWebDavRequestBudget(origin, async (budgetFetch) => {
      await expectAsync(budgetFetch('https://other.example/file')).toBeRejected();
      await expectAsync(
        budgetFetch(origin.replace('https://', 'https://user:secret@') + '/file'),
      ).toBeRejected();
      const response = await budgetFetch(new Request(`${origin}/file`), {
        redirect: 'follow',
      });
      expect(response.status).toBe(204);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.calls.mostRecent().args[1]?.redirect).toBe('error');
    });
  });

  it('honours an explicit null signal overriding an aborted Request signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const request = new Request(`${origin}/file`, { signal: controller.signal });
    expect(new Request(request, { signal: null }).signal.aborted).toBeFalse();
    await APP_WEBDAV_FETCH()(request, { signal: null });
    await runWithWebDavRequestBudget(origin, async (budgetFetch) => {
      await budgetFetch(request, { signal: null });
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid scope origins before invoking their action', async () => {
    const action = jasmine.createSpy('action');
    for (const invalid of [
      origin + '/path',
      origin + '?query',
      origin + '#hash',
      origin.replace('https://', 'https://fixture:secret@'),
      'ftp://files.example',
    ]) {
      await expectAsync(runWithWebDavRequestBudget(invalid, action)).toBeRejected();
    }
    expect(action).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('revokes a saved fetch and releases the lease after an action failure', async () => {
    let savedFetch!: typeof fetch;
    await expectAsync(
      runWithWebDavRequestBudget(origin, async (budgetFetch) => {
        savedFetch = budgetFetch;
        await budgetFetch(`${origin}/one`);
        await budgetFetch(`${origin}/two`);
        throw new Error('fixture action failed');
      }),
    ).toBeRejectedWithError('fixture action failed');
    await expectAsync(savedFetch(`${origin}/late`)).toBeRejectedWithError(/finished/);
    for (let index = 0; index < 5; index++)
      await APP_WEBDAV_FETCH()(`${origin}/ordinary`);
    expect(fetchSpy.calls.count()).toBe(7);
  });

  it('cancels a queued raw fetch without waiting for its token after lifetime revocation', async () => {
    const lifetime = new AbortController();
    const pending = runWithWebDavRequestBudget(
      origin,
      async (budgetFetch) => {
        await budgetFetch(`${origin}/one`);
        await budgetFetch(`${origin}/two`);
        await budgetFetch(`${origin}/three`);
      },
      lifetime.signal,
    );
    await settle();
    expect(fetchSpy.calls.count()).toBe(2);
    lifetime.abort();
    await expectAsync(pending).toBeRejected();
    expect(fetchSpy.calls.count()).toBe(2);
    await APP_WEBDAV_FETCH()(`${origin}/ordinary`);
    expect(fetchSpy.calls.count()).toBe(3);
  });

  it('rejects an aborted raw waiter immediately behind an unsignalled provider without bypassing its queue', async () => {
    const lifetime = new AbortController();
    let provider!: Promise<Response>;
    let rejected = false;
    const action = runWithWebDavRequestBudget(
      origin,
      async (budgetFetch) => {
        await budgetFetch(`${origin}/one`);
        await budgetFetch(`${origin}/two`);
        provider = APP_WEBDAV_FETCH()(`${origin}/provider-head`);
        await budgetFetch(`${origin}/aborted-raw`);
      },
      lifetime.signal,
    ).catch(() => {
      rejected = true;
    });
    await settle();
    expect(fetchSpy.calls.count()).toBe(2);
    lifetime.abort();
    await settle();
    expect(rejected).toBeTrue();
    expect(fetchSpy.calls.count()).toBe(2);
    // The action may release its lease, but provider admission still owns the tail.
    const following = APP_WEBDAV_FETCH()(`${origin}/following-provider`);
    await settle();
    expect(fetchSpy.calls.count()).toBe(2);
    jasmine.clock().tick(6000);
    await settle();
    expect(fetchSpy.calls.count()).toBe(3);
    expect(fetchSpy.calls.mostRecent().args[0]).toBe(`${origin}/provider-head`);
    jasmine.clock().tick(6000);
    await settle();
    await Promise.all([action, provider, following]);
    expect(fetchSpy.calls.count()).toBe(4);
    expect(
      fetchSpy.calls.allArgs().some(([input]) => String(input).endsWith('/aborted-raw')),
    ).toBeFalse();
    await APP_WEBDAV_FETCH()(`${origin}/ordinary`);
    expect(fetchSpy.calls.count()).toBe(5);
  });

  it('keeps a scope active until the real action settles after lifetime revocation', async () => {
    const lifetime = new AbortController();
    let finishAction!: () => void;
    let savedFetch!: typeof fetch;
    const action = new Promise<void>((resolve) => (finishAction = resolve));
    let settled = false;
    void runWithWebDavRequestBudget(
      origin,
      async (budgetFetch) => {
        savedFetch = budgetFetch;
        await budgetFetch(`${origin}/first`);
        await budgetFetch(`${origin}/second`);
        await action;
      },
      lifetime.signal,
    ).finally(() => (settled = true));
    await settle();
    lifetime.abort();
    void savedFetch(`${origin}/late`).catch(() => {});
    let providerFinished = false;
    void APP_WEBDAV_FETCH()(`${origin}/sync/ongoing`).then(
      () => (providerFinished = true),
    );
    await settle();
    expect(settled).toBeFalse();
    expect(fetchSpy.calls.count()).toBe(2);
    jasmine.clock().tick(6000);
    await settle();
    expect(providerFinished).toBeTrue();
    expect(fetchSpy.calls.count()).toBe(3);
    finishAction();
    await settle();
    expect(settled).toBeTrue();
    void APP_WEBDAV_FETCH()(`${origin}/ordinary`);
    await settle();
    expect(fetchSpy.calls.count()).toBe(4);
  });

  it('aborts an in-flight raw request on unload and releases only after it settles', async () => {
    const lifetime = new AbortController();
    let requestSignal: AbortSignal | null | undefined;
    fetchSpy.and.callFake(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          requestSignal = init?.signal;
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
            once: true,
          });
        }),
    );
    const pending = runWithWebDavRequestBudget(
      origin,
      async (budgetFetch) => budgetFetch(`${origin}/file`),
      lifetime.signal,
    );
    for (let index = 0; index < 5 && !requestSignal; index++) await Promise.resolve();
    lifetime.abort();
    await expectAsync(pending).toBeRejected();
    expect(requestSignal?.aborted).toBeTrue();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('passes 429 through once and fails provider requests fast during the shared cooldown', async () => {
    fetchSpy.and.callFake(
      async () =>
        new Response(null, {
          status: 429,
          headers: new Headers([['Retry-After', '12']]),
        }),
    );
    let finished = false;
    void runWithWebDavRequestBudget(origin, async (budgetFetch) => {
      expect((await budgetFetch(`${origin}/raw`)).status).toBe(429);
      await expectAsync(APP_WEBDAV_FETCH()(`${origin}/sync/data`)).toBeRejected();
      finished = true;
    });
    await settle();
    expect(fetchSpy.calls.count()).toBe(1);
    expect(finished).toBeTrue();
    void expectAsync(APP_WEBDAV_FETCH()(`${origin}/ordinary`)).toBeRejected();
    await settle();
    expect(fetchSpy.calls.count()).toBe(1);
    jasmine.clock().tick(12000);
    void APP_WEBDAV_FETCH()(`${origin}/ordinary`);
    await settle();
    expect(fetchSpy.calls.count()).toBe(2);
    expect(finished).toBeTrue();
  });

  it('immediately stops an already waiting request when another response starts a cooldown', async () => {
    let answer!: (response: Response) => void;
    let calls = 0;
    fetchSpy.and.callFake(() => {
      calls++;
      return calls === 1
        ? new Promise<Response>((resolve) => (answer = resolve))
        : Promise.resolve(new Response(null, { status: 204 }));
    });
    let stopped = false;
    void runWithWebDavRequestBudget(origin, async (budgetFetch) => {
      const first = budgetFetch(`${origin}/first`);
      const second = budgetFetch(`${origin}/second`);
      const third = budgetFetch(`${origin}/third`);
      await expectAsync(third).toBeRejected();
      stopped = true;
      await first;
      await second;
    });
    await settle();
    expect(fetchSpy.calls.count()).toBe(2);
    answer(new Response(null, { status: 429 }));
    await settle();
    expect(stopped).toBeTrue();
    expect(fetchSpy.calls.count()).toBe(2);
    jasmine.clock().tick(6000);
    await settle();
  });
});
