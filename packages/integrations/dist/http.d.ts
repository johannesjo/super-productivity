export type AuthScheme = {
    type: 'token';
    token: string;
} | {
    type: 'basic';
    userName: string;
    password: string;
} | {
    type: 'oauth2';
    accessToken: string;
};
export interface HttpRequest {
    baseUrl: string;
    path: string;
    auth: AuthScheme;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'REPORT' | 'PROPFIND' | 'PROPPATCH' | 'MKCOL';
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
export declare class IntegrationHttpError extends Error {
    readonly status: number;
    constructor(status: number, message: string);
}
export declare const buildUrl: (baseUrl: string, path: string, query?: HttpRequest["query"]) => string;
export declare const requestJson: <T>(options: HttpRequest) => Promise<HttpResult<T>>;
export declare const requestText: (options: HttpRequest) => Promise<HttpResult<string>>;
