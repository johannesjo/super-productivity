import { describe, expect, it } from 'vitest';
import { EncryptedOperationTransport, FileProviderOperationEndpoint, MemorySyncCursorRepository, NouraSyncHttpEndpoint, } from './sync';
const task = {
    id: 'task-1',
    title: 'Sync me',
    notes: '',
    status: 'open',
    priority: 0,
    projectId: 'inbox',
    subtaskIds: [],
    tagIds: [],
    checklist: [],
    sections: [],
    attachments: [],
    estimateMs: 0,
    trackedMs: 0,
    createdAt: 1,
    updatedAt: 1,
    order: 0,
};
const domainOperation = {
    id: 'op-1',
    clientId: 'client-1',
    sequence: 1,
    timestamp: 1,
    command: { type: 'task/add', payload: { task } },
    source: 'local',
};
describe('NouraSyncHttpEndpoint', () => {
    it('maps encrypted domain operations to the retained NouraSync contract', async () => {
        let request;
        const endpoint = new NouraSyncHttpEndpoint({
            baseUrl: 'https://sync.example.test/',
            accessToken: 'secret-token',
            fetch: async (input, init) => {
                request = new Request(input, init);
                return Response.json({
                    results: [{ accepted: true, serverSeq: 7 }],
                    latestSeq: 7,
                });
            },
        });
        const result = await endpoint.upload({
            serverSeq: 3,
            id: domainOperation.id,
            clientId: domainOperation.clientId,
            timestamp: domainOperation.timestamp,
            vectorClock: { 'client-1': 1 },
            encryptedPayload: 'encrypted',
            domainOperation,
        });
        const body = (await request?.json());
        expect(result).toEqual({ serverSeq: 7 });
        expect(request?.url).toBe('https://sync.example.test/api/sync/ops');
        expect(request?.headers.get('authorization')).toBe('Bearer secret-token');
        expect(body.ops[0]).toMatchObject({
            actionType: 'task/add',
            opType: 'CRT',
            entityType: 'TASK',
            entityId: 'task-1',
            payload: 'encrypted',
            isPayloadEncrypted: true,
        });
    });
    it('maps downloaded wire operations back to encrypted operations', async () => {
        const endpoint = new NouraSyncHttpEndpoint({
            baseUrl: 'https://sync.example.test',
            accessToken: 'token',
            fetch: async () => Response.json({
                ops: [
                    {
                        serverSeq: 9,
                        receivedAt: 2,
                        op: {
                            id: 'remote-op',
                            clientId: 'remote',
                            actionType: 'task/update',
                            opType: 'UPD',
                            entityType: 'TASK',
                            payload: 'ciphertext',
                            vectorClock: { remote: 2 },
                            timestamp: 2,
                            schemaVersion: 1,
                            isPayloadEncrypted: true,
                        },
                    },
                ],
                latestSeq: 9,
                hasMore: false,
            }),
        });
        const result = await endpoint.download(4, 'client-1');
        expect(result).toEqual({
            operations: [
                {
                    serverSeq: 9,
                    id: 'remote-op',
                    clientId: 'remote',
                    timestamp: 2,
                    vectorClock: { remote: 2 },
                    encryptedPayload: 'ciphertext',
                },
            ],
            latestSeq: 9,
            hasMore: false,
        });
    });
});
class MemoryRevisionedProvider {
    id = 'MemoryDrive';
    data;
    rev = 0;
    conflictOnce = false;
    async downloadFile() {
        if (!this.data) {
            const error = new Error('missing');
            error.name = 'RemoteFileNotFoundAPIError';
            throw error;
        }
        return { rev: String(this.rev), dataStr: this.data };
    }
    async uploadFile(_path, dataStr, revToMatch) {
        if (this.conflictOnce) {
            this.conflictOnce = false;
            const remote = JSON.parse(dataStr);
            const other = {
                serverSeq: 1,
                id: 'concurrent-op',
                clientId: 'other',
                timestamp: 1,
                vectorClock: { other: 1 },
                encryptedPayload: 'other-ciphertext',
            };
            this.data = JSON.stringify({
                version: 1,
                latestSeq: 1,
                updatedAt: 1,
                operations: [other, ...remote.operations.filter((op) => op.id !== 'local-op')],
            });
            this.rev = 1;
            const error = new Error('conflict');
            error.name = 'UploadRevToMatchMismatchAPIError';
            throw error;
        }
        if (this.data && revToMatch !== String(this.rev)) {
            const error = new Error('conflict');
            error.name = 'UploadRevToMatchMismatchAPIError';
            throw error;
        }
        if (!this.data && revToMatch !== null)
            throw new Error('expected create');
        this.data = dataStr;
        this.rev += 1;
        return { rev: String(this.rev) };
    }
}
describe('FileProviderOperationEndpoint', () => {
    const encryptedOperation = (id, clientId) => ({
        serverSeq: 0,
        id,
        clientId,
        timestamp: 1,
        vectorClock: { [clientId]: 1 },
        encryptedPayload: `${id}-ciphertext`,
    });
    it('creates an operation file and filters the downloading client', async () => {
        const provider = new MemoryRevisionedProvider();
        const endpoint = new FileProviderOperationEndpoint({ provider });
        await endpoint.upload(encryptedOperation('first', 'client-a'));
        await endpoint.upload(encryptedOperation('second', 'client-b'));
        const result = await endpoint.download(0, 'client-a');
        expect(result.latestSeq).toBe(2);
        expect(result.operations.map((operation) => operation.id)).toEqual(['second']);
    });
    it('re-reads and merges after a conditional-write conflict', async () => {
        const provider = new MemoryRevisionedProvider();
        provider.conflictOnce = true;
        const endpoint = new FileProviderOperationEndpoint({ provider });
        const result = await endpoint.upload(encryptedOperation('local-op', 'client-a'));
        const file = JSON.parse(provider.data ?? '{}');
        expect(result.serverSeq).toBe(2);
        expect(file.latestSeq).toBe(2);
        expect(file.operations.map((operation) => operation.id)).toEqual([
            'concurrent-op',
            'local-op',
        ]);
    });
});
describe('EncryptedOperationTransport cursors', () => {
    it('does not skip unseen remote operations when an upload receives a later sequence', async () => {
        const cursor = new MemorySyncCursorRepository();
        const endpoint = {
            upload: async () => ({ serverSeq: 8 }),
            download: async () => ({ operations: [], latestSeq: 0, hasMore: false }),
        };
        const transport = new EncryptedOperationTransport(endpoint, cursor, 'client-1', 'password-123');
        await transport.push(domainOperation);
        expect((await cursor.load()).serverSeq).toBe(0);
    });
});
