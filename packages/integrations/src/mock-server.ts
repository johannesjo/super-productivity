// In-memory HTTP "server" used to exercise the full provider pipeline end to
// end without a network: routes keyed by (method, path prefix) return canned
// bodies. Services use this as the fetch implementation.

export interface MockRoute {
  method: string;
  /** Path prefix match. */
  path: string;
  status?: number;
  body: string | object;
  /** Predicate on the request; return false to fall through to a 404. */
  match?: (input: string, init?: RequestInit) => boolean;
}

export interface MockServerOptions {
  baseUrl: string;
  routes: MockRoute[];
  onRequest?: (method: string, url: string) => void;
}

export class MockServer {
  readonly #options: MockServerOptions;
  readonly requests: Array<{ method: string; url: string }> = [];

  constructor(options: MockServerOptions) {
    this.#options = options;
  }

  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    this.requests.push({ method, url });
    this.#options.onRequest?.(method, url);
    for (const route of this.#options.routes) {
      if (route.method.toUpperCase() !== method) continue;
      if (!url.startsWith(`${this.#options.baseUrl}${route.path}`)) continue;
      if (route.match && !route.match(url, init)) continue;
      const body =
        typeof route.body === 'string' ? route.body : JSON.stringify(route.body);
      return new Response(body, {
        status: route.status ?? 200,
        headers: {
          'content-type':
            typeof route.body === 'string' ? 'text/calendar' : 'application/json',
        },
      });
    }
    return new Response('{"error":"not found"}', { status: 404 });
  };
}
