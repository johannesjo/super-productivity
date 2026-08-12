// Framework-free HTTP plumbing for compiled-in providers. Each call goes
// through the injected fetch so tests use mocks and the Tauri/web hosts
// provide the real transport. No credentials are ever logged or persisted.
export class IntegrationHttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.name = 'IntegrationHttpError';
        this.status = status;
    }
}
const authorizationHeader = (auth) => {
    if (auth.type === 'token')
        return { authorization: `Bearer ${auth.token}` };
    if (auth.type === 'oauth2')
        return { authorization: `Bearer ${auth.accessToken}` };
    return { authorization: `Basic ${btoa(`${auth.userName}:${auth.password}`)}` };
};
export const buildUrl = (baseUrl, path, query) => {
    const url = new URL(path.startsWith('/') ? path : `/${path}`, baseUrl.replace(/\/+$/, ''));
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined)
                url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
};
export const requestJson = async (options) => {
    const { baseUrl, path, auth, method = 'GET', query, json, fetch: fetchImpl = globalThis.fetch, timeoutMs = 20_000, headers, } = options;
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
            },
            body: json !== undefined ? JSON.stringify(json) : undefined,
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new IntegrationHttpError(response.status, `HTTP ${response.status} from ${path}`);
        }
        const text = await response.text();
        return { status: response.status, body: (text ? JSON.parse(text) : {}) };
    }
    finally {
        clearTimeout(timer);
    }
};
export const requestText = async (options) => {
    const { baseUrl, path, auth, method = 'GET', query, json, fetch: fetchImpl = globalThis.fetch, timeoutMs = 20_000, headers, } = options;
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
            },
            body: json !== undefined ? JSON.stringify(json) : undefined,
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new IntegrationHttpError(response.status, `HTTP ${response.status} from ${path}`);
        }
        return { status: response.status, body: await response.text() };
    }
    finally {
        clearTimeout(timer);
    }
};
