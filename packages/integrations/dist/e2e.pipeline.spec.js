import { describe, expect, it } from 'vitest';
import { createInitialState, migrateDomainState, reduceDomain, } from '@noura/domain';
import { buildIssueWorklogs, CalDavClient, importBacklogSeeds, IssuePoller, issueToTaskSeed, JiraClient, parseIcs, } from './index';
import { MockServer } from './mock-server';
// Phase 7 gate: Jira + CalDAV provider pipelines over a headless mock server —
// search -> transform -> task seeds -> poll/backlog -> worklog export, and
// CalDAV REPORT -> iCalendar events.
const icsPayload = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:focus-1',
    'SUMMARY:Focus block',
    'DESCRIPTION:Deep work sesh',
    'LOCATION:Desk',
    'DTSTART:20260721T100000Z',
    'DTEND:20260721T110000Z',
    'END:VEVENT',
    'END:VCALENDAR',
].join('\r\n');
const buildServer = () => {
    const baseUrl = 'https://mock.test';
    const server = new MockServer({
        baseUrl,
        routes: [
            {
                method: 'GET',
                path: '/rest/api/2/serverInfo',
                body: { id: 'mock', version: '1000' },
            },
            {
                method: 'GET',
                path: '/rest/api/2/search',
                body: {
                    issues: [
                        {
                            id: '10001',
                            key: 'SP-1',
                            fields: {
                                summary: 'Ship release',
                                description: {
                                    type: 'doc',
                                    content: [
                                        { type: 'paragraph', content: [{ type: 'text', text: 'Go live' }] },
                                    ],
                                },
                                status: { name: 'To Do' },
                                priority: { name: 'High' },
                                assignee: { displayName: 'Ada' },
                            },
                        },
                        {
                            id: '10002',
                            key: 'SP-2',
                            fields: {
                                summary: 'Retro notes',
                                description: '',
                                status: { name: 'Done' },
                                priority: { name: 'Low' },
                            },
                        },
                    ],
                },
            },
            {
                method: 'REPORT',
                path: '/calendars/personal',
                body: `<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:response><C:calendar-data>${icsPayload.replace(/</g, '&lt;')}</C:calendar-data></D:response></D:multistatus>`,
            },
        ],
    });
    return { server, baseUrl, fetch: server.fetch };
};
describe('provider pipeline E2E (mock server)', () => {
    it('jira: search -> transform -> seeds -> poll -> worklog export', async () => {
        const { fetch: mockFetch, server } = buildServer();
        const auth = { type: 'token', token: 'tok' };
        const jira = new JiraClient({
            baseUrl: 'https://mock.test',
            auth,
            fetch: mockFetch,
        });
        expect(await jira.testConnection()).toBe(true);
        const issues = await jira.search('project = SP');
        expect(issues).toHaveLength(2);
        const seeds = importBacklogSeeds(issues, 'JIRA');
        expect(seeds).toHaveLength(2);
        expect(seeds[0]).toMatchObject({
            title: expect.stringContaining('SP-1'),
            priority: 3,
        });
        const poller = new IssuePoller({
            fetch: () => jira.search('project = SP'),
            onNew: () => undefined,
        });
        const fresh = await poller.poll();
        await poller.poll();
        expect(fresh).toHaveLength(2);
        expect(poller.knownCount()).toBe(2);
        // Backlog seeds become domain tasks; a worklog export then maps them back.
        const task = (overrides = {}) => ({
            id: 't1',
            title: 'T',
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
            ...overrides,
        });
        let state = migrateDomainState(createInitialState());
        for (const seed of seeds) {
            state = reduceDomain(state, {
                type: 'task/add',
                payload: {
                    task: task({
                        id: seed.issue.issueId,
                        title: seed.title,
                        notes: seed.notes,
                        priority: seed.priority,
                        issue: seed.issue,
                    }),
                },
            });
        }
        state = reduceDomain(state, {
            type: 'worklog/from-entry',
            payload: {
                entry: {
                    id: 'w1',
                    taskId: '10001',
                    mode: 'stopwatch',
                    startedAt: 1000,
                    endedAt: 7000,
                    durationMs: 6000,
                    source: 'timer',
                    updatedAt: 7000,
                },
            },
        });
        const exports = buildIssueWorklogs(state, 'JIRA');
        expect(exports).toHaveLength(1);
        expect(exports[0]).toMatchObject({ issueKey: 'SP-1', timeSpentSeconds: 6 });
        expect(server.requests.map((request) => request.method)).toContain('GET');
    });
    it('caldav: report window -> iCalendar events parsed end to end', async () => {
        const { fetch: mockFetch } = buildServer();
        const cal = new CalDavClient({
            baseUrl: 'https://mock.test',
            auth: { type: 'basic', userName: 'u', password: 'p' },
            principalPath: '/calendars/personal',
            fetch: mockFetch,
        });
        const events = await cal.events('/calendars/personal', '2026-07-20T00:00:00Z', '2026-07-22T00:00:00Z');
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            uid: 'focus-1',
            summary: 'Focus block',
            allDay: false,
        });
        // Ingest path: raw ICS to normalized events used by the Planner agenda.
        const parsed = parseIcs(icsPayload);
        expect(parsed[0]?.description).toBe('Deep work sesh');
    });
    it('exposes issueToTaskSeed for calendar-adjacent captures', () => {
        const seed = issueToTaskSeed({
            id: '1',
            key: 'K',
            title: 'Item',
            description: '',
            state: '',
            priority: 0,
            url: '',
            createdAt: '',
            updatedAt: '',
        }, 'JIRA');
        expect(seed.issue.key).toBe('K');
    });
});
