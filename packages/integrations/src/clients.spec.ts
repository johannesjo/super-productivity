import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  migrateDomainState,
  reduceDomain,
  type Task,
} from '@noura/domain';
import {
  buildIssueWorklogs,
  CalDavClient,
  fromJiraDescription,
  importBacklogSeeds,
  issueToTaskSeed,
  IssuePoller,
  JiraClient,
  parseIcs,
  worklogToJiraPayload,
} from './index';
import { requestJson } from './http';

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('http + auth', () => {
  it('sends bearer tokens and parses json', async () => {
    let auth = '';
    const fetchImpl = async (input: unknown, init?: RequestInit) => {
      auth = String((init?.headers as Record<string, string>)?.authorization);
      return jsonResponse({ ok: true });
    };
    await requestJson({
      baseUrl: 'https://x.test/rest',
      path: '/ping',
      auth: { type: 'token', token: 'tok' },
      fetch: fetchImpl as typeof fetch,
    });
    expect(auth).toBe('Bearer tok');
  });

  it('throws typed errors on non-2xx responses', async () => {
    const fetchImpl = async () => new Response('nope', { status: 404 });
    await expect(
      requestJson({
        baseUrl: 'https://x.test',
        path: '/nope',
        auth: { type: 'token', token: 't' },
        fetch: fetchImpl as typeof fetch,
      }),
    ).rejects.toMatchObject({ name: 'IntegrationHttpError', status: 404 });
  });
});

describe('jira adapter', () => {
  it('searches issues and maps them to remote issues', async () => {
    const fetchImpl = async (input: unknown): Promise<Response> => {
      const url = String(input);
      if (url.includes('/search')) {
        return jsonResponse({
          issues: [
            {
              id: '10001',
              key: 'SP-1',
              fields: {
                summary: 'Ship v1',
                description: {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Plan release' }],
                    },
                  ],
                },
                status: { name: 'To Do' },
                priority: { name: 'High' },
                assignee: { displayName: 'Ada' },
              },
            },
          ],
        });
      }
      return jsonResponse({});
    };
    const client = new JiraClient({
      baseUrl: 'https://x.atlassian.net',
      auth: { type: 'token', token: 't' },
      fetch: fetchImpl as typeof fetch,
    });
    const issues = await client.search('project = SP');
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      key: 'SP-1',
      title: 'Ship v1',
      state: 'To Do',
      priority: 3,
      assignee: 'Ada',
    });
    expect(
      fromJiraDescription({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
      }),
    ).toBe('hi');
  });

  it('posts comments', async () => {
    let posted = '';
    const fetchImpl = async (input: unknown, init?: RequestInit) => {
      posted = String(init?.body);
      return jsonResponse({
        id: 'c1',
        body: 'looking good',
        author: { displayName: 'Bob' },
        created: 'now',
      });
    };
    const client = new JiraClient({
      baseUrl: 'https://x.atlassian.net',
      auth: { type: 'token', token: 't' },
      fetch: fetchImpl as typeof fetch,
    });
    const comment = await client.addComment('SP-1', 'looking good');
    expect(posted).toContain('"looking good"');
    expect(comment).toMatchObject({ id: 'c1', author: 'Bob' });
  });

  it('probes the server for connection checks', async () => {
    const fetchImpl = async () => jsonResponse({ id: 'x' });
    const client = new JiraClient({
      baseUrl: 'https://x.atlassian.net',
      auth: { type: 'token', token: 't' },
      fetch: fetchImpl as typeof fetch,
    });
    expect(await client.testConnection()).toBe(true);
  });
});

describe('transforms', () => {
  it('maps an issue to a task seed with a linked issue ref', () => {
    const seed = issueToTaskSeed(
      {
        id: '9',
        key: 'SP-9',
        title: 'Fix bug',
        description: 'Details',
        state: 'Open',
        priority: 2,
        url: 'https://x/SP-9',
        createdAt: 'a',
        updatedAt: 'b',
      },
      'JIRA',
    );
    expect(seed.title).toContain('SP-9');
    expect(seed.notes).toContain('Details');
    expect(seed.priority).toBe(2);
    expect(seed.issue).toMatchObject({ providerId: 'JIRA', issueId: '9', key: 'SP-9' });
  });

  it('imports a backlog into seeds', () => {
    const seeds = importBacklogSeeds(
      [
        {
          id: '1',
          key: 'A-1',
          title: 'One',
          description: '',
          state: 'Open',
          priority: 0,
          url: 'u',
          createdAt: 'x',
          updatedAt: 'y',
        },
        {
          id: '2',
          key: 'A-2',
          title: 'Two',
          description: '',
          state: 'Open',
          priority: 1,
          url: 'u',
          createdAt: 'x',
          updatedAt: 'y',
        },
      ],
      'JIRA',
    );
    expect(seeds).toHaveLength(2);
    expect(seeds[1].priority).toBe(1);
  });
});

describe('ical + caldav', () => {
  it('parses a small VCALENDAR into events', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:evt-1',
      'SUMMARY:Standup',
      'DTSTART:20260720T090000Z',
      'DTEND:20260720T091500Z',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:evt-2',
      'SUMMARY:Birthday',
      'DTSTART;VALUE=DATE:20260722',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const events = parseIcs(ics);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ uid: 'evt-1', summary: 'Standup', allDay: false });
    expect(events[1]).toMatchObject({ uid: 'evt-2', allDay: true });
  });

  it('queries a CalDAV calendar and returns parsed events', async () => {
    const ics =
      'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:1\r\nSUMMARY:Focus block\r\nDTSTART:20260721T100000Z\r\nDTEND:20260721T110000Z\r\nEND:VEVENT\r\nEND:VCALENDAR';
    const fetchImpl = async (input: unknown, init?: RequestInit) => {
      if (init?.method === 'REPORT') {
        return new Response(
          `<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:response><C:calendar-data>${ics.replace(/</g, '&lt;')}</C:calendar-data></D:response></D:multistatus>`,
          { status: 207 },
        );
      }
      return new Response(
        '<D:multistatus xmlns:D="DAV:"><D:response><D:href>/cal/personal/</D:href></D:response></D:multistatus>',
        { status: 207 },
      );
    };
    const client = new CalDavClient({
      baseUrl: 'https://cal.test',
      auth: { type: 'basic', userName: 'u', password: 'p' },
      fetch: fetchImpl as typeof fetch,
    });
    const events = await client.events(
      '/cal/personal/',
      '2026-07-20T00:00:00Z',
      '2026-07-22T00:00:00Z',
    );
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe('Focus block');
  });
});

describe('polling + worklog export', () => {
  it('dedupes poll results and emits only new issues', async () => {
    const calls: string[][] = [];
    const poller = new IssuePoller({
      fetch: async () => [
        {
          id: '1',
          key: 'K-1',
          title: 'A',
          description: '',
          state: '',
          priority: 0,
          url: '',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          key: 'K-2',
          title: 'B',
          description: '',
          state: '',
          priority: 0,
          url: '',
          createdAt: '',
          updatedAt: '',
        },
      ],
      onNew: (issues) => calls.push(issues.map((issue) => issue.id)),
    });
    await poller.poll();
    await poller.poll();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(['1', '2']);
    expect(poller.knownCount()).toBe(2);
  });

  it('exports issue-linked worklogs for a provider', () => {
    const task = (overrides: Partial<Task> = {}): Task => ({
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
    state = reduceDomain(state, {
      type: 'task/add',
      payload: {
        task: task({
          id: 'a',
          issue: { providerId: 'JIRA', issueId: '9', key: 'SP-9', url: 'u' },
        }),
      },
    });
    state = reduceDomain(state, {
      type: 'task/add',
      payload: {
        task: task({
          id: 'b',
          issue: { providerId: 'GITHUB', issueId: '1', key: 'repo#1', url: 'u' },
        }),
      },
    });
    state = reduceDomain(state, {
      type: 'worklog/from-entry',
      payload: {
        entry: {
          id: 'w1',
          taskId: 'a',
          mode: 'stopwatch',
          startedAt: 1000,
          endedAt: 7000,
          durationMs: 6000,
          source: 'timer',
          updatedAt: 7000,
        },
      },
    });
    const entries = buildIssueWorklogs(state, 'JIRA');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.issueKey).toBe('SP-9');
    expect(entries[0]?.timeSpentSeconds).toBe(6);
    expect(worklogToJiraPayload(entries[0])).toMatchObject({ timeSpentSeconds: 6 });
  });
});
