import { describe, expect, it } from 'vitest';
import { SuperSyncHttpEndpoint } from './sync';
const task = {
    id: 'task-1',
    title: 'Sync me',
    notes: '',
    status: 'open',
    priority: 0,
    projectId: 'inbox',
    tagIds: [],
    checklist: [],
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
describe('SuperSyncHttpEndpoint', () => {
    it('maps encrypted domain operations to the retained SuperSync contract', async () => {
        let request;
        const endpoint = new SuperSyncHttpEndpoint({
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
        const endpoint = new SuperSyncHttpEndpoint({
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
