import { decrypt, encrypt, mergeVectorClocks } from '@sp/sync-core';
const operationShape = (operation) => {
    const id = 'id' in operation.command.payload ? operation.command.payload.id : undefined;
    if (operation.command.type === 'task/add')
        return {
            opType: 'CRT',
            entityType: 'TASK',
            entityId: operation.command.payload.task.id,
        };
    if (operation.command.type === 'task/remove')
        return { opType: 'DEL', entityType: 'TASK', entityId: id };
    if (operation.command.type === 'task/reorder')
        return { opType: 'MOV', entityType: 'TASK' };
    if (operation.command.type.startsWith('task/'))
        return { opType: 'UPD', entityType: 'TASK', entityId: id };
    if (operation.command.type === 'project/add')
        return {
            opType: 'CRT',
            entityType: 'PROJECT',
            entityId: operation.command.payload.project.id,
        };
    if (operation.command.type.startsWith('project/'))
        return { opType: 'UPD', entityType: 'PROJECT', entityId: id };
    if (operation.command.type.startsWith('session/'))
        return {
            opType: operation.command.type === 'session/start' ? 'CRT' : 'UPD',
            entityType: 'TIME_TRACKING',
            entityId: id ??
                ('session' in operation.command.payload
                    ? operation.command.payload.session.id
                    : undefined),
        };
    return { opType: 'UPD', entityType: 'ALL' };
};
export class NouraSyncHttpEndpoint {
    #baseUrl;
    #accessToken;
    #fetch;
    constructor(options) {
        this.#baseUrl = options.baseUrl.replace(/\/$/, '');
        this.#accessToken = options.accessToken.trim();
        this.#fetch = options.fetch ?? globalThis.fetch;
    }
    async upload(operation) {
        const domainOperation = operation.domainOperation;
        const shape = domainOperation
            ? operationShape(domainOperation)
            : { opType: 'UPD', entityType: 'ALL' };
        const wireOperation = {
            id: operation.id,
            clientId: operation.clientId,
            actionType: domainOperation?.command.type ?? 'domain/operation',
            ...shape,
            payload: operation.encryptedPayload,
            vectorClock: operation.vectorClock,
            timestamp: operation.timestamp,
            schemaVersion: 1,
            isPayloadEncrypted: true,
        };
        const response = await this.#request('/api/sync/ops', {
            method: 'POST',
            body: JSON.stringify({
                ops: [wireOperation],
                clientId: operation.clientId,
                lastKnownServerSeq: operation.serverSeq,
                requestId: operation.id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64),
            }),
        });
        const result = response.results[0];
        if (!result?.accepted)
            throw new Error(result?.error || 'NouraSync rejected the operation');
        return { serverSeq: result.serverSeq ?? response.latestSeq };
    }
    async download(sinceSeq, excludeClient) {
        const query = new URLSearchParams({
            sinceSeq: String(sinceSeq),
            excludeClient,
            limit: '500',
        });
        const response = await this.#request(`/api/sync/ops?${query.toString()}`, { method: 'GET' });
        return {
            operations: response.ops.map(({ serverSeq, op }) => ({
                serverSeq,
                id: op.id,
                clientId: op.clientId,
                timestamp: op.timestamp,
                vectorClock: op.vectorClock,
                encryptedPayload: op.payload,
            })),
            latestSeq: response.latestSeq,
            hasMore: response.hasMore,
        };
    }
    subscribe(_sinceSeq, onAvailable, clientId) {
        if (typeof WebSocket === 'undefined') {
            const timer = setInterval(onAvailable, 15_000);
            return () => clearInterval(timer);
        }
        let stopped = false;
        let socket;
        let retryTimer;
        const connect = () => {
            const webSocketUrl = new URL('/api/sync/ws', this.#baseUrl);
            webSocketUrl.protocol = webSocketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
            webSocketUrl.search = new URLSearchParams({
                token: this.#accessToken,
                clientId,
            }).toString();
            socket = new WebSocket(webSocketUrl);
            socket.addEventListener('message', (event) => {
                try {
                    const message = JSON.parse(String(event.data));
                    if (message.type === 'new_ops')
                        onAvailable();
                }
                catch {
                    // Ignore non-protocol frames; the HTTP sync path remains authoritative.
                }
            });
            socket.addEventListener('close', () => {
                if (!stopped)
                    retryTimer = setTimeout(connect, 5_000);
            });
        };
        connect();
        return () => {
            stopped = true;
            if (retryTimer)
                clearTimeout(retryTimer);
            socket?.close();
        };
    }
    async #request(path, init) {
        if (!this.#accessToken)
            throw new Error('A NouraSync access token is required');
        const response = await this.#fetch(`${this.#baseUrl}${path}`, {
            ...init,
            headers: {
                authorization: `Bearer ${this.#accessToken}`,
                'content-type': 'application/json',
                ...init.headers,
            },
        });
        if (!response.ok)
            throw new Error(`NouraSync request failed (${response.status})`);
        return (await response.json());
    }
}
export class EncryptedOperationTransport {
    endpoint;
    cursorRepository;
    clientId;
    passphrase;
    #listeners = new Set();
    #syncing;
    #stopRealtime;
    constructor(endpoint, cursorRepository, clientId, passphrase) {
        this.endpoint = endpoint;
        this.cursorRepository = cursorRepository;
        this.clientId = clientId;
        this.passphrase = passphrase;
    }
    async start() {
        const cursor = await this.cursorRepository.load();
        this.#stopRealtime = this.endpoint.subscribe?.(cursor.serverSeq, () => void this.sync(), this.clientId);
        await this.sync();
    }
    stop() {
        this.#stopRealtime?.();
        this.#stopRealtime = undefined;
    }
    subscribe(onOperation) {
        this.#listeners.add(onOperation);
        return () => this.#listeners.delete(onOperation);
    }
    async push(operation) {
        const cursor = await this.cursorRepository.load();
        const nextClock = { ...cursor.vectorClock, [this.clientId]: operation.sequence };
        const encryptedPayload = await encrypt(JSON.stringify(operation), this.passphrase);
        const result = await this.endpoint.upload({
            serverSeq: cursor.serverSeq,
            id: operation.id,
            clientId: this.clientId,
            timestamp: operation.timestamp,
            vectorClock: nextClock,
            encryptedPayload,
            domainOperation: operation,
        });
        await this.cursorRepository.save({
            serverSeq: Math.max(cursor.serverSeq, result.serverSeq),
            vectorClock: nextClock,
        });
    }
    sync() {
        this.#syncing ??= this.#drain().finally(() => {
            this.#syncing = undefined;
        });
        return this.#syncing;
    }
    async #drain() {
        let cursor = await this.cursorRepository.load();
        let hasMore = true;
        while (hasMore) {
            const response = await this.endpoint.download(cursor.serverSeq, this.clientId);
            for (const remote of response.operations) {
                const operation = JSON.parse(await decrypt(remote.encryptedPayload, this.passphrase));
                const replay = { ...operation, source: 'remote' };
                for (const listener of this.#listeners)
                    await listener(replay);
                cursor = {
                    serverSeq: Math.max(cursor.serverSeq, remote.serverSeq),
                    vectorClock: mergeVectorClocks(cursor.vectorClock, remote.vectorClock),
                };
            }
            cursor = { ...cursor, serverSeq: Math.max(cursor.serverSeq, response.latestSeq) };
            await this.cursorRepository.save(cursor);
            hasMore = response.hasMore;
        }
    }
}
export class MemorySyncCursorRepository {
    #cursor = { serverSeq: 0, vectorClock: {} };
    async load() {
        return structuredClone(this.#cursor);
    }
    async save(cursor) {
        this.#cursor = structuredClone(cursor);
    }
}
