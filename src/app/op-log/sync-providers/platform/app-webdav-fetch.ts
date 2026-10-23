import type { WebFetchFactory } from '@sp/sync-providers/platform';
import { APP_WEB_FETCH } from './app-web-fetch';
import { WEBDAV_REQUEST_BUDGET } from './webdav-request-budget';
import { APP_PROVIDER_PLATFORM_INFO } from './app-provider-platform-info';

const requestUrl = (input: RequestInfo | URL): URL =>
  new URL(input instanceof Request ? input.url : String(input));

const requestSignal = (
  input: RequestInfo | URL,
  init?: RequestInit,
): AbortSignal | undefined =>
  init?.signal !== undefined
    ? (init.signal ?? undefined)
    : input instanceof Request
      ? input.signal
      : undefined;

/** Only the WebDAV factory uses this wrapper; other providers keep APP_WEB_FETCH. */
export const APP_WEBDAV_FETCH: WebFetchFactory = () => async (input, init) => {
  const url = requestUrl(input).href;
  const signal = requestSignal(input, init);
  return WEBDAV_REQUEST_BUDGET.run(
    url,
    async () => {
      signal?.throwIfAborted();
      const response = await APP_WEB_FETCH()(input, init);
      WEBDAV_REQUEST_BUDGET.response(url, response);
      return response;
    },
    signal,
  );
};

/**
 * A background plugin action owns the lease until it actually settles.
 * Lifetime revocation aborts only its raw requests, not an already running sync.
 */
export const runWithWebDavRequestBudget = async <T>(
  origin: string,
  action: (budgetFetch: typeof fetch) => Promise<T>,
  lifetimeSignal?: AbortSignal,
): Promise<T> => {
  if (APP_PROVIDER_PLATFORM_INFO.isNativePlatform) {
    throw new Error('WebDAV request budget does not support native HTTP');
  }
  const target = new URL(origin);
  if (
    !['https:', 'http:'].includes(target.protocol) ||
    target.username ||
    target.password ||
    target.pathname !== '/' ||
    target.search ||
    target.hash
  )
    throw new Error('WebDAV request budget requires an HTTP origin without credentials');
  lifetimeSignal?.throwIfAborted();
  const release = WEBDAV_REQUEST_BUDGET.acquire(target.origin);
  const scopeLifetime = new AbortController();
  const scopeSignal = lifetimeSignal
    ? AbortSignal.any([lifetimeSignal, scopeLifetime.signal])
    : scopeLifetime.signal;
  let active = true;
  const budgetFetch: typeof fetch = async (input, init) => {
    if (!active) throw new Error('WebDAV request budget action has finished');
    scopeSignal.throwIfAborted();
    const url = requestUrl(input);
    if (url.origin !== target.origin || url.username || url.password) {
      throw new Error(
        'WebDAV request budget blocks a different origin or URL credentials',
      );
    }
    const callerSignal = requestSignal(input, init);
    const signal = callerSignal
      ? AbortSignal.any([scopeSignal, callerSignal])
      : scopeSignal;
    return APP_WEBDAV_FETCH()(input, { ...init, signal, redirect: 'error' });
  };
  try {
    return await action(budgetFetch);
  } finally {
    active = false;
    scopeLifetime.abort();
    release();
  }
};
