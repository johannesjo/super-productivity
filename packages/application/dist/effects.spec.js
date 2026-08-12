import { describe, expect, it } from 'vitest';
import { createInitialState, reduceDomain } from '@noura/domain';
import { buildCompletionHistoryCommand, buildFinishDayCommand, buildPlanCommands, buildWorklogCommand, focusDaySummary, morningReview, nextDay, } from './index';
const task = (overrides = {}) => ({
    id: 'task-1',
    title: 'A task',
    notes: '',
    status: 'open',
    priority: 0,
    projectId: 'inbox',
    subtaskIds: [],
    tagIds: [],
    checklist: [],
    sections: [],
    attachments: [],
    estimateMs: 1_000,
    trackedMs: 0,
    createdAt: 1,
    updatedAt: 1,
    order: 0,
    ...overrides,
});
describe('daily effects', () => {
    it('advances today deterministically', () => {
        expect(nextDay('2026-07-20')).toBe('2026-07-21');
        expect(nextDay('2026-12-31')).toBe('2027-01-01');
    });
    it('builds a finish-day history entry from done tasks and tracked time', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: {
                task: task({ id: 'a', estimateMs: 60_000, trackedMs: 30_000 }),
            },
        });
        state = reduceDomain(state, {
            type: 'task/toggle',
            payload: { id: 'a', doneOn: Date.UTC(2026, 6, 20, 12) },
        });
        state = reduceDomain(state, {
            type: 'session/manual',
            payload: {
                entry: {
                    id: 's1',
                    taskId: 'a',
                    mode: 'stopwatch',
                    startedAt: 1,
                    endedAt: 2,
                    durationMs: 1,
                    date: '2026-07-20',
                    source: 'manual',
                    updatedAt: 2,
                },
            },
        });
        const [command] = buildFinishDayCommand(state, '2026-07-20');
        expect(command?.type === 'history/record' && command.payload.entry).toMatchObject({
            date: '2026-07-20',
            tasksDone: 1,
            totalTimeEstimate: 60_000,
            totalTimeSpent: 1,
        });
    });
    it('plans overdue open tasks onto tomorrow, leaving repeating tasks alone', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: {
                task: task({ id: 'overdue', dueDay: '2026-07-10' }),
            },
        });
        state = reduceDomain(state, {
            type: 'task/add',
            payload: {
                task: task({ id: 'repeat', dueDay: '2026-07-10', repeatCfgId: 'rc1' }),
            },
        });
        const commands = buildPlanCommands(state, '2026-07-20');
        expect(commands).toHaveLength(1);
        expect(commands[0]).toMatchObject({
            type: 'task/update',
            payload: { id: 'overdue', patch: { dueDay: '2026-07-21' } },
        });
    });
    it('surfaces the morning review projection', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: { task: task({ id: 'overdue', dueDay: '2026-07-10' }) },
        });
        state = reduceDomain(state, {
            type: 'task/add',
            payload: { task: task({ id: 'today', dueDay: '2026-07-20' }) },
        });
        const review = morningReview(state, '2026-07-20');
        expect(review.dueToday.map((entry) => entry.id)).toEqual(['today']);
        expect(review.overdue.map((entry) => entry.id)).toEqual(['overdue']);
        expect(review.count).toBe(2);
    });
});
describe('focus effects', () => {
    it('records a completed task into the day history', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: { task: task({ id: 'a', estimateMs: 30_000 }) },
        });
        state = reduceDomain(state, { type: 'task/toggle', payload: { id: 'a', doneOn: 5 } });
        const [command] = buildCompletionHistoryCommand(state, state.tasks.a, 5);
        expect(command?.type === 'history/record' && command.payload.entry.tasksDone).toBe(1);
        expect(command?.type === 'history/record' && command.payload.entry.totalTimeEstimate).toBe(30_000);
    });
    it('builds a worklog command only for finished entries', () => {
        const finished = {
            id: 's1',
            taskId: 'a',
            mode: 'flowtime',
            startedAt: 100,
            endedAt: 200,
            durationMs: 100,
            source: 'timer',
            updatedAt: 200,
        };
        const commands = buildWorklogCommand(finished);
        expect(commands).toHaveLength(1);
        expect(commands[0]).toMatchObject({
            type: 'worklog/from-entry',
            payload: { entry: { id: 's1' } },
        });
        const stillRunning = buildWorklogCommand({ ...finished, endedAt: undefined });
        expect(stillRunning).toEqual([]);
    });
    it('projects the focus-day summary from tracked entries', () => {
        const state = reduceDomain(createInitialState(1), {
            type: 'session/manual',
            payload: {
                entry: {
                    id: 's1',
                    taskId: 'a',
                    mode: 'stopwatch',
                    startedAt: 100,
                    endedAt: 300,
                    durationMs: 200,
                    date: '2026-07-20',
                    source: 'manual',
                    updatedAt: 300,
                },
            },
        });
        const summary = focusDaySummary(state, '2026-07-20');
        expect(summary.totalMs).toBe(200);
        expect(summary.count).toBe(1);
    });
});
