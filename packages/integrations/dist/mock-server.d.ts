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
export declare class MockServer {
    #private;
    readonly requests: Array<{
        method: string;
        url: string;
    }>;
    constructor(options: MockServerOptions);
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}
