import { describe, expect, it } from 'vitest';
import { DomainStore, MemoryStateRepository } from './index';
import { EncryptedOperationTransport, MemorySyncCursorRepository, } from './sync';
// Client-side full sync E2E: two devices converge over the retained wire
// contract (upload/download with serverSeq + vector clock + encryption), with
// real WebCrypto, replay semantics, and a wrong-passphrase failure.
class InMemoryServer {
    nextSeq = 0;
    operations = [];
    async upload(operation) {
        if (this.operations.some((item) => item.id === operation.id)) {
            return {
                serverSeq: this.operations.find((item) => item.id === operation.id)?.serverSeq ?? 0,
            };
        }
        this.nextSeq += 1;
        this.operations.push({ ...operation, serverSeq: this.nextSeq });
        return { serverSeq: this.nextSeq };
    }
    async download(sinceSeq, excludeClient) {
        const operations = this.operations
            .filter((op) => op.serverSeq > sinceSeq && op.clientId !== excludeClient)
            .sort((a, b) => a.serverSeq - b.serverSeq);
        return { operations, latestSeq: this.nextSeq, hasMore: false };
    }
}
const makeClient = (server, clientId, passphrase) => {
    const store = new DomainStore(new MemoryStateRepository(), clientId);
    const transport = new EncryptedOperationTransport(server, new MemorySyncCursorRepository(), clientId, passphrase);
    store.connectTransport(transport);
    return { store, transport };
};
const pushTask = (id) => ({
    id: `${id}-op`,
    clientId: 'client-a',
    sequence: 1,
    timestamp: 1,
    command: {
        type: 'task/add',
        payload: {
            task: {
                id,
                title: 'Synced task',
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
            },
        },
    },
    source: 'local',
});
describe('two-device sync round trip (client transport, real encryption)', () => {
    it('converges state from device A to device B through the wire contract', async () => {
        const server = new InMemoryServer();
        const a = makeClient(server, 'client-a', 'shared-passphrase');
        const b = makeClient(server, 'client-b', 'shared-passphrase');
        await a.transport.start();
        await b.transport.start();
        const task = pushTask('task-1');
        await a.store.execute(task.command, { operationId: task.id });
        // Device B pulls the encrypted op and replays it deterministically.
        await b.transport.sync();
        const bState = b.store.getState();
        expect(bState.tasks['task-1']?.title).toBe('Synced task');
        expect(server.operations).toHaveLength(1);
        expect(server.operations[0]?.encryptedPayload).not.toContain('Synced task');
    });
    it('rejects decryption with the wrong passphrase', async () => {
        const server = new InMemoryServer();
        const a = makeClient(server, 'client-a', 'right-passphrase');
        const b = makeClient(server, 'client-b', 'wrong-passphrase');
        const op2 = pushTask('task-2');
        await a.transport.start();
        await a.store.execute(op2.command, { operationId: op2.id });
        await expect(b.transport.sync()).rejects.toThrow();
    });
    it('never re-pushes remote operations back to the server', async () => {
        const server = new InMemoryServer();
        const a = makeClient(server, 'client-a', 'shared-passphrase');
        const b = makeClient(server, 'client-b', 'shared-passphrase');
        await a.transport.start();
        await b.transport.start();
        const op3 = pushTask('task-3');
        await a.store.execute(op3.command, { operationId: op3.id });
        await b.transport.sync();
        const countAfterDownload = server.operations.length;
        // Local device B intent is the only thing that should ever be uploaded.
        await b.store.execute({ type: 'task/update', payload: { id: 'task-3', patch: { title: 'Edited on B' } } }, { operationId: 'b-op' });
        await b.transport.sync();
        expect(server.operations.length).toBe(countAfterDownload + 1);
        // And A can now pull B's edit.
        await a.transport.sync();
        const aState = a.store.getState();
        expect(aState.tasks['task-3']?.title).toBe('Edited on B');
    });
});
