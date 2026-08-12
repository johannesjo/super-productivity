import { describe, expect, it } from 'vitest';
import { createInitialState, reduceDomain } from '@noura/domain';
import { LocalRestApi } from './local-http';
import { searchDomain } from './services/search';
const makeDeps = () => {
    let state = reduceDomain(createInitialState(1), {
        type: 'task/add',
        payload: {
            task: {
                id: 'a',
                title: 'Ship capture parsing',
                notes: '',
                status: 'open',
                priority: 2,
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
    });
    const deps = {
        getState: () => state,
        execute: async (command) => {
            state = reduceDomain(state, command);
            return {
                id: 'op-1',
                clientId: 'local',
                sequence: 1,
                timestamp: 1,
                command,
                source: 'local',
            };
        },
        search: (query) => searchDomain(state, query),
        exportBackup: async () => ({ format: 'noura-backup-encrypted', payload: 'mock' }),
        importBackup: async () => undefined,
    };
    return deps;
};
describe('LocalRestApi', () => {
    const api = new LocalRestApi(makeDeps());
    it('serves health, state, and search', async () => {
        const health = await api.handle(new Request('http://localhost/api/health'));
        expect(health.status).toBe(200);
        expect((await health.json())).toEqual({
            ok: true,
            version: '0.1.0',
        });
        const state = await api.handle(new Request('http://localhost/api/state'));
        const body = (await state.json());
        expect(body.tasks.a).toBeDefined();
        const search = await api.handle(new Request('http://localhost/api/search?q=capture'));
        const searchBody = (await search.json());
        expect(searchBody.results.length).toBeGreaterThan(0);
    });
    it('executes commands through POST /api/ops', async () => {
        const response = await api.handle(new Request('http://localhost/api/ops', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                command: { type: 'task/update', payload: { id: 'a', patch: { priority: 3 } } },
            }),
        }));
        expect(response.status).toBe(200);
        const body = (await response.json());
        expect(body.operation).toBeDefined();
    });
    it('returns worklog and history projections', async () => {
        const worklog = await api.handle(new Request('http://localhost/api/worklog'));
        expect(worklog.status).toBe(200);
        const history = await api.handle(new Request('http://localhost/api/history'));
        expect(history.status).toBe(200);
    });
    it('rejects unknown routes with 404', async () => {
        const response = await api.handle(new Request('http://localhost/nope'));
        expect(response.status).toBe(404);
    });
    it('requires a command on ops', async () => {
        const response = await api.handle(new Request('http://localhost/api/ops', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({}),
        }));
        expect(response.status).toBe(400);
    });
});
