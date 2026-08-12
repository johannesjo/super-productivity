import { describe, expect, it } from 'vitest';
import { createInitialState, migrateDomainState, reduceDomain } from '@noura/domain';
import { countState, importSummary } from './summary';
describe('import review counts', () => {
    it('counts an imported state across all families', () => {
        let state = migrateDomainState(createInitialState());
        state = reduceDomain(state, {
            type: 'task/add',
            payload: {
                task: {
                    id: 'a',
                    title: 'A',
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
        });
        state = reduceDomain(state, {
            type: 'task/add',
            payload: {
                task: {
                    id: 'done',
                    title: 'Done',
                    notes: '',
                    status: 'done',
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
                    doneOn: 5,
                    order: 1,
                },
            },
        });
        const counts = countState(state);
        expect(counts.tasks).toBe(2);
        expect(counts.doneTasks).toBe(1);
        expect(counts.projects).toBe(1);
        expect(importSummary(counts)).toContain('2 tasks (1 done)');
    });
});
