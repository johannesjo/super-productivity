import { describe, expect, it } from 'vitest';
import { parseCapture } from './capture';
const ctx = { today: '2026-07-20', now: Date.parse('2026-07-20T09:00:00Z') };
describe('parseCapture', () => {
    it('keeps a plain title untouched', () => {
        expect(parseCapture('Write migration notes', ctx)).toMatchObject({
            title: 'Write migration notes',
            tagNames: [],
            subtaskChain: [],
        });
    });
    it('returns undefined for empty or whitespace input', () => {
        expect(parseCapture('   ', ctx)).toBeUndefined();
        expect(parseCapture('', ctx)).toBeUndefined();
    });
    it('parses priority from p2 and !3 forms', () => {
        expect(parseCapture('Ship release p2', ctx)?.priority).toBe(2);
        expect(parseCapture('!3 Emergency', ctx)?.priority).toBe(3);
        expect(parseCapture('Normal wording p5', ctx)?.priority).toBeUndefined();
    });
    it('extracts tags and a project', () => {
        const parsed = parseCapture('Review PR #api #review @team due:2026-07-24', ctx);
        expect(parsed).toMatchObject({
            title: 'Review PR',
            tagNames: ['api', 'review'],
            projectName: 'team',
        });
    });
    it('parses project:word and due dates with and without time', () => {
        const dated = parseCapture('Update docs due:2026-07-24 18:00', ctx);
        expect(dated).toMatchObject({ title: 'Update docs', dueDay: '2026-07-24' });
        expect(dated?.dueAt).toBeDefined();
        expect(new Date(dated?.dueAt ?? 0).toISOString()).toContain('T18:00');
        const relative = parseCapture('Update docs due:tomorrow', ctx);
        expect(relative?.dueDay).toBe('2026-07-21');
        expect(parseCapture('Today due:today', ctx)?.dueDay).toBe('2026-07-20');
    });
    it('parses start and reminder time', () => {
        const parsed = parseCapture('Meeting start:2026-07-22 10:00 remind:+30m', ctx);
        expect(parsed?.start).toBe('2026-07-22');
        expect(parsed?.startAt).toBeDefined();
        expect(parsed?.title).toBe('Meeting');
        expect(parsed?.reminderAt).toBeDefined();
        expect(Date.parse(parsed?.reminderAt ?? '')).toBe(Date.parse('2026-07-20T09:00:00Z') + 30 * 60_000);
    });
    it('parses repeat keywords and day lists', () => {
        expect(parseCapture('Standup repeat:daily', ctx)?.repeat).toMatchObject({
            repeatEveryUnit: 'DAILY',
            repeatEvery: 1,
        });
        expect(parseCapture('Review rec:every 2 weeks', ctx)?.repeat).toMatchObject({
            repeatEveryUnit: 'WEEKLY',
            repeatEvery: 2,
        });
        expect(parseCapture('Catch up rec:mon,thu', ctx)?.repeat).toMatchObject({
            repeatEveryUnit: 'WEEKLY',
            daysOfWeek: [1, 4],
        });
    });
    it('splits nested subtasks on >', () => {
        const parsed = parseCapture('Project > Milestone > Ship v1 !2', ctx);
        expect(parsed).toMatchObject({
            subtaskChain: ['Project', 'Milestone'],
            title: 'Ship v1',
            priority: 2,
        });
    });
    it('strips the recognized tokens from the title', () => {
        const parsed = parseCapture('Fix bug #backlog @ops due:2026-07-25 p1', ctx);
        expect(parsed?.title).toBe('Fix bug');
    });
});
