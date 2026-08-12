// Framework-free HTTP plumbing for compiled-in providers. Each call goes
// through the injected fetch so tests use mocks and the Tauri/web hosts
// provide the real transport. No credentials are ever logged or persisted.

export type AuthScheme =
  | { type: 'token'; token: string }
  | { type: 'basic'; userName: string; password: string }
  | { type: 'oauth2'; accessToken: string };

export interface HttpRequest {
  baseUrl: string;
  path: string;
  auth: AuthScheme;
  method?:
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'REPORT'
    | 'PROPFIND'
    | 'PROPPATCH'
    | 'MKCOL';
  query?: Record<string, string | number | boolean | undefined>;
  json?: unknown;
  fetch?: typeof globalThis.fetch;
  /** Adds a short timeout so polling operators fail fast (ms). */
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface HttpResult<T> {
  status: number;
  body: T;
}

export class IntegrationHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'IntegrationHttpError';
    this.status = status;
  }
}

const authorizationHeader = (auth: AuthScheme): Record<string, string> => {
  if (auth.type === 'token') return { authorization: `Bearer ${auth.token}` };
  if (auth.type === 'oauth2') return { authorization: `Bearer ${auth.accessToken}` };
  return { authorization: `Basic ${btoa(`${auth.userName}:${auth.password}`)}` };
};

export const buildUrl = (
  baseUrl: string,
  path: string,
  query?: HttpRequest['query'],
): string => {
  const url = new URL(
    path.startsWith('/') ? path : `/${path}`,
    baseUrl.replace(/\/+$/, ''),
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
};

export const requestJson = async <T>(options: HttpRequest): Promise<HttpResult<T>> => {
  const {
    baseUrl,
    path,
    auth,
    method = 'GET',
    query,
    json,
    fetch: fetchImpl = globalThis.fetch,
    timeoutMs = 20_000,
    headers,
  } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(buildUrl(baseUrl, path, query), {
      method,
      headers: {
        accept: 'application/json',
        'content-type': json !== undefined ? 'application/json' : undefined,
        ...authorizationHeader(auth),
        ...headers,
      } as Record<string, string>,
      body: json !== undefined ? JSON.stringify(json) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new IntegrationHttpError(
        response.status,
        `HTTP ${response.status} from ${path}`,
      );
    }
    const text = await response.text();
    return { status: response.status, body: (text ? JSON.parse(text) : {}) as T };
  } finally {
    clearTimeout(timer);
  }
};

export const requestText = async (options: HttpRequest): Promise<HttpResult<string>> => {
  const {
    baseUrl,
    path,
    auth,
    method = 'GET',
    query,
    json,
    fetch: fetchImpl = globalThis.fetch,
    timeoutMs = 20_000,
    headers,
  } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(buildUrl(baseUrl, path, query), {
      method,
      headers: {
        accept: '*/*',
        'content-type': json !== undefined ? 'application/json' : undefined,
        ...authorizationHeader(auth),
        ...headers,
      } as Record<string, string>,
      body: json !== undefined ? JSON.stringify(json) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new IntegrationHttpError(
        response.status,
        `HTTP ${response.status} from ${path}`,
      );
    }
    return { status: response.status, body: await response.text() };
  } finally {
    clearTimeout(timer);
  }
};
