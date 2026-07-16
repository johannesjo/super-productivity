import { Hono, type Context } from 'hono';
import { Readable } from 'node:stream';

export interface HttpRouteGeneric {
  Body?: unknown;
  Querystring?: object;
  Params?: object;
}

export interface HttpRequest<Generic extends HttpRouteGeneric = HttpRouteGeneric> {
  body: Generic['Body'];
  query: Generic['Querystring'] extends object
    ? Generic['Querystring']
    : Record<string, string>;
  params: Generic['Params'] extends object ? Generic['Params'] : Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
  ip: string;
  raw: Request;
  user?: { userId: number; email: string };
}

export type RequestPayload = Readable;
export type PreParsingHook = (
  request: HttpRequest,
  reply: HttpReply,
  payload: RequestPayload,
  done: (error: Error | null, payload?: RequestPayload) => void,
) => void;

export type HttpHandler<Generic extends HttpRouteGeneric = HttpRouteGeneric> = (
  request: HttpRequest<Generic>,
  reply: HttpReply,
) => unknown | Promise<unknown>;

export type HttpHook = (
  request: HttpRequest,
  reply: HttpReply,
) => unknown | Promise<unknown>;

interface RateLimitConfig {
  max: number;
  timeWindow: string;
  keyGenerator?: (request: HttpRequest) => string;
}

interface RouteOptions {
  schema?: unknown;
  bodyLimit?: number;
  preHandler?: HttpHook | HttpHook[];
  preParsing?: PreParsingHook;
  config?: {
    rateLimit?: false | RateLimitConfig;
  };
}

type ContentParser = (
  request: HttpRequest,
  body: Buffer,
  done: (error: Error | null, body?: unknown) => void,
) => void;

interface InjectOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  payload?: unknown;
}

export interface InjectResponse {
  statusCode: number;
  headers: Headers;
  body: string;
  json<T = unknown>(): T;
}

class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, number[]>();

  check(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;
    const entries = (this.buckets.get(key) ?? []).filter((time) => time > cutoff);
    if (entries.length >= max) {
      this.buckets.set(key, entries);
      return false;
    }
    entries.push(now);
    this.buckets.set(key, entries);
    return true;
  }

  clear(): void {
    this.buckets.clear();
  }
}

const parseWindowMs = (window: string): number => {
  const match = /^\s*(\d+)\s*(second|minute|hour)s?\s*$/i.exec(window);
  if (!match) return 60_000;
  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return value * (unit === 'hour' ? 3_600_000 : unit === 'minute' ? 60_000 : 1_000);
};

const getRequestIp = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',', 1)[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
};

const headersToRecord = (headers: Headers): Record<string, string> =>
  Object.fromEntries(Array.from(headers.entries()).map(([key, value]) => [key, value]));

const queryToRecord = (url: URL): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (!(key in result)) result[key] = value;
  }
  return result;
};

export class HttpReply {
  private statusCode = 200;
  private contentType: string | undefined;
  private readonly responseHeaders = new Headers();
  private payload: unknown;
  private sent = false;

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  code(code: number): this {
    return this.status(code);
  }

  type(value: string): this {
    this.contentType = value;
    return this;
  }

  header(name: string, value: string | number): this {
    this.responseHeaders.set(name, String(value));
    return this;
  }

  send(payload?: unknown): this {
    this.payload = payload;
    this.sent = true;
    return this;
  }

  get isSent(): boolean {
    return this.sent;
  }

  toResponse(fallback?: unknown): Response {
    const payload = this.sent ? this.payload : fallback;
    if (payload instanceof Response) return payload;

    if (payload === undefined || payload === null) {
      return new Response(payload === null ? 'null' : null, {
        status: this.statusCode,
        headers: this.responseHeaders,
      });
    }

    if (
      typeof payload === 'string' ||
      payload instanceof Uint8Array ||
      payload instanceof ArrayBuffer
    ) {
      if (this.contentType) this.responseHeaders.set('content-type', this.contentType);
      return new Response(payload as BodyInit, {
        status: this.statusCode,
        headers: this.responseHeaders,
      });
    }

    this.responseHeaders.set('content-type', this.contentType ?? 'application/json');
    return new Response(JSON.stringify(payload), {
      status: this.statusCode,
      headers: this.responseHeaders,
    });
  }
}

const parseBody = async (
  request: HttpRequest,
  reply: HttpReply,
  parser: ContentParser | undefined,
  bodyLimit: number,
  preParsing?: PreParsingHook,
): Promise<unknown> => {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  let bytes = Buffer.from(await request.raw.arrayBuffer());
  if (bytes.length > bodyLimit) {
    const error = Object.assign(
      new Error(`Request body exceeded ${bodyLimit} byte limit`),
      {
        statusCode: 413,
      },
    );
    throw error;
  }
  if (bytes.length === 0) return undefined;

  if (preParsing) {
    const stream = await new Promise<Readable>((resolve, reject) => {
      const payload = Readable.from(bytes);
      preParsing(request, reply, payload, (error, parsedPayload) => {
        if (error) reject(error);
        else resolve(parsedPayload ?? payload);
      });
    });
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    bytes = Buffer.concat(chunks);
  }

  if (parser) {
    return new Promise((resolve, reject) => {
      parser(request, bytes, (error, body) => (error ? reject(error) : resolve(body)));
    });
  }

  const contentType = request.raw.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('application/json')) {
    try {
      return JSON.parse(bytes.toString('utf8'));
    } catch {
      throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 });
    }
  }
  return bytes;
};

export class HttpApp {
  readonly hono: Hono;
  private readonly hooks: HttpHook[] = [];
  private readonly parsers = new Map<string, ContentParser>();
  private readonly rateLimiter: SlidingWindowRateLimiter;

  constructor(
    hono = new Hono(),
    private readonly prefix = '',
    rateLimiter = new SlidingWindowRateLimiter(),
  ) {
    this.hono = hono;
    this.rateLimiter = rateLimiter;
  }

  addHook(name: 'preHandler', hook: HttpHook): void {
    if (name === 'preHandler') this.hooks.push(hook);
  }

  addContentTypeParser(
    contentType: string,
    _options: { parseAs: 'buffer' },
    parser: ContentParser,
  ): void {
    this.parsers.set(contentType.toLowerCase(), parser);
  }

  async register(
    plugin: (app: HttpApp) => void | Promise<void>,
    options: { prefix?: string } = {},
  ): Promise<void> {
    const scoped = new HttpApp(
      this.hono,
      `${this.prefix}${options.prefix ?? ''}`,
      this.rateLimiter,
    );
    await plugin(scoped);
  }

  get<Generic extends HttpRouteGeneric = HttpRouteGeneric>(
    path: string,
    optionsOrHandler: RouteOptions | HttpHandler<Generic>,
    maybeHandler?: HttpHandler<Generic>,
  ): void {
    this.route('GET', path, optionsOrHandler, maybeHandler);
  }

  post<Generic extends HttpRouteGeneric = HttpRouteGeneric>(
    path: string,
    optionsOrHandler: RouteOptions | HttpHandler<Generic>,
    maybeHandler?: HttpHandler<Generic>,
  ): void {
    this.route('POST', path, optionsOrHandler, maybeHandler);
  }

  put<Generic extends HttpRouteGeneric = HttpRouteGeneric>(
    path: string,
    optionsOrHandler: RouteOptions | HttpHandler<Generic>,
    maybeHandler?: HttpHandler<Generic>,
  ): void {
    this.route('PUT', path, optionsOrHandler, maybeHandler);
  }

  delete<Generic extends HttpRouteGeneric = HttpRouteGeneric>(
    path: string,
    optionsOrHandler: RouteOptions | HttpHandler<Generic>,
    maybeHandler?: HttpHandler<Generic>,
  ): void {
    this.route('DELETE', path, optionsOrHandler, maybeHandler);
  }

  private route<Generic extends HttpRouteGeneric>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    optionsOrHandler: RouteOptions | HttpHandler<Generic>,
    maybeHandler?: HttpHandler<Generic>,
  ): void {
    const options = typeof optionsOrHandler === 'function' ? {} : optionsOrHandler;
    const handler =
      typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler;
    if (!handler) throw new Error(`Missing handler for ${method} ${path}`);
    const fullPath = `${this.prefix}${path}` || '/';
    const hooks = [...this.hooks];
    const routeHooks = Array.isArray(options.preHandler)
      ? options.preHandler
      : options.preHandler
        ? [options.preHandler]
        : [];

    const honoHandler = async (context: Context): Promise<Response> => {
      const raw = context.req.raw;
      const url = new URL(raw.url);
      const request: HttpRequest = {
        body: undefined,
        query: queryToRecord(url),
        params: context.req.param(),
        headers: headersToRecord(raw.headers),
        method,
        url: `${url.pathname}${url.search}`,
        ip: getRequestIp(raw),
        raw,
      };
      const reply = new HttpReply();

      try {
        const rateLimit = options.config?.rateLimit;
        if (rateLimit) {
          const key = rateLimit.keyGenerator?.(request) ?? request.ip;
          if (
            !this.rateLimiter.check(
              key,
              rateLimit.max,
              parseWindowMs(rateLimit.timeWindow),
            )
          ) {
            return reply.status(429).send({ error: 'Rate limit exceeded' }).toResponse();
          }
        }

        const contentType = (raw.headers.get('content-type') ?? '')
          .split(';', 1)[0]
          .toLowerCase();
        const parser = this.parsers.get(contentType);
        request.body = await parseBody(
          request,
          reply,
          parser,
          options.bodyLimit ?? 20 * 1024 * 1024,
          options.preParsing,
        );

        for (const hook of [...hooks, ...routeHooks]) {
          const hookResult = await hook(request, reply);
          if (reply.isSent) return reply.toResponse(hookResult);
        }

        const result = await handler(request as HttpRequest<Generic>, reply);
        return reply.toResponse(result);
      } catch (error) {
        const statusCode =
          typeof error === 'object' &&
          error !== null &&
          typeof (error as { statusCode?: unknown }).statusCode === 'number'
            ? (error as { statusCode: number }).statusCode
            : 500;
        if (statusCode >= 500) {
          console.error(`Request failed ${method} ${url.pathname}`, error);
          return new Response(
            JSON.stringify({ statusCode: 500, error: 'Internal Server Error' }),
            { status: 500, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ error: (error as Error).message }), {
          status: statusCode,
          headers: { 'content-type': 'application/json' },
        });
      }
    };

    if (method === 'GET') this.hono.get(fullPath, honoHandler);
    else if (method === 'POST') this.hono.post(fullPath, honoHandler);
    else if (method === 'PUT') this.hono.put(fullPath, honoHandler);
    else this.hono.delete(fullPath, honoHandler);
  }

  async inject(options: InjectOptions): Promise<InjectResponse> {
    const headers = new Headers(options.headers);
    let body: BodyInit | undefined;
    if (options.payload !== undefined) {
      if (
        typeof options.payload === 'string' ||
        options.payload instanceof Uint8Array ||
        options.payload instanceof ArrayBuffer
      ) {
        body = options.payload as BodyInit;
      } else {
        body = JSON.stringify(options.payload);
        if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      }
    }
    const response = await this.hono.request(options.url, {
      method: options.method,
      headers,
      body,
    });
    const responseBody = await response.text();
    return {
      statusCode: response.status,
      headers: response.headers,
      body: responseBody,
      json: <T>() => JSON.parse(responseBody) as T,
    };
  }

  clearRateLimits(): void {
    this.rateLimiter.clear();
  }
}
