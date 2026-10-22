import { expect, Page } from '@playwright/test';

// Plainspace has no E2E harness in this repo, so its integration API is stubbed
// with a small stateful fake that answers with the real wire shapes (`SPTask`,
// `/me`). The server side is covered by Plainspace's own integration tests.

export const PLAINSPACE_HOST = 'https://plainspace.org';

export const PLAINSPACE_SPACE = {
  id: 'space-alpha-id',
  name: 'Alpha',
  slug: 'alpha',
  memberDisplayName: 'Me',
  role: 'owner',
};

/** The integration API's task DTO (`SPTask`). */
export interface FakeSpTask {
  id: string;
  title: string;
  done: boolean;
  projectId: string;
  projectName: string;
  projectSlug: string;
  listId: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  isRecurring: boolean;
}

export interface FakePatch {
  id: string;
  body: Record<string, unknown>;
  status: number;
}

export interface FakePlainspace {
  /** Every task of the space, keyed by id. */
  tasks: Map<string, FakeSpTask>;
  /** Ids of tasks assigned to me; only these are listed, read and patched. */
  assignedIds: Set<string>;
  /** `/tasks` (the poll) gets no answer. */
  isTasksOffline: boolean;
  /** No request gets an answer: the device is offline. */
  isOffline: boolean;
  /** Requests that got no answer while offline, as `METHOD /path`. */
  offlineRequests: string[];
  /** PATCH answers 500. */
  isPatchServerError: boolean;
  /** POST /tasks (create) answers 500. */
  isCreateServerError: boolean;
  /** PATCH answers 409 with this error (any conflict other than the repeat rule). */
  patchConflictError: string | null;
  /**
   * A server from before `title`/`scheduledAt` were accepted: a PATCH without
   * `done` is a 422, and any other field next to `done` is ignored.
   */
  isOldServer: boolean;
  patches: FakePatch[];
  /** Runs right after a PATCH was answered, e.g. a collaborator's edit. */
  afterPatch: (() => void) | null;
  /**
   * Runs when a PATCH arrives, before it is applied: a collaborator's edit
   * that lands between our fetch and our write, so our PATCH answer carries it.
   */
  beforePatch: (() => void) | null;
  /** Titles of every create request, failed ones included. */
  creates: string[];
  taskListRequests: { status: number }[];
  /** A collaborator edits a task in Plainspace's web app. */
  remoteEdit: (id: string, changes: Partial<FakeSpTask>) => void;
  addAssignedTask: (id: string, title: string) => FakeSpTask;
}

let clock = Date.parse('2026-10-20T08:00:00.000Z');
const nextUpdatedAt = (): string => {
  clock += 60_000;
  return new Date(clock).toISOString();
};

/**
 * `shared`: route this page to an existing fake instead of a new one, so two
 * clients (two SP devices) talk to the same Plainspace space.
 */
export const installFakePlainspace = async (
  page: Page,
  shared?: FakePlainspace,
): Promise<FakePlainspace> => {
  const cors = {
    ['access-control-allow-origin']: '*',
    ['access-control-allow-headers']: 'authorization, content-type',
    ['access-control-allow-methods']: 'GET, POST, PATCH, DELETE, OPTIONS',
  };
  const newTask = (id: string, title: string): FakeSpTask => ({
    id,
    title,
    done: false,
    projectId: PLAINSPACE_SPACE.id,
    projectName: PLAINSPACE_SPACE.name,
    projectSlug: PLAINSPACE_SPACE.slug,
    listId: 'list-1',
    url: `${PLAINSPACE_HOST}/${PLAINSPACE_SPACE.slug}/item/${id}`,
    createdAt: nextUpdatedAt(),
    updatedAt: nextUpdatedAt(),
    scheduledAt: null,
    isRecurring: false,
  });

  const server: FakePlainspace = shared ?? {
    tasks: new Map(),
    assignedIds: new Set(),
    isTasksOffline: false,
    isOffline: false,
    offlineRequests: [],
    isPatchServerError: false,
    isCreateServerError: false,
    patchConflictError: null,
    isOldServer: false,
    patches: [],
    afterPatch: null,
    beforePatch: null,
    creates: [],
    taskListRequests: [],
    remoteEdit: (id, changes) => {
      const task = server.tasks.get(id)!;
      server.tasks.set(id, { ...task, ...changes, updatedAt: nextUpdatedAt() });
    },
    addAssignedTask: (id, title) => {
      const task = newTask(id, title);
      server.tasks.set(id, task);
      server.assignedIds.add(id);
      return task;
    },
  };

  await page.route(/^https:\/\/plainspace\.org\/api\/integration\//, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/integration', '');
    const json = (status: number, body: unknown): Promise<void> =>
      route.fulfill({ status, headers: cors, json: body });
    const taskMatch = path.match(/^\/tasks\/([^/]+)$/);
    const assignedTask = (id: string): FakeSpTask | undefined =>
      server.assignedIds.has(id) ? server.tasks.get(id) : undefined;

    if (server.isOffline) {
      server.offlineRequests.push(`${req.method()} ${path}`);
      await route.abort('internetdisconnected');
      return;
    }
    if (path === '/me') {
      await json(200, { email: 'me@e2e.test', projects: [PLAINSPACE_SPACE] });
    } else if (path === '/tasks' && req.method() === 'GET') {
      if (server.isTasksOffline) {
        server.taskListRequests.push({ status: 0 });
        await route.abort('internetdisconnected');
        return;
      }
      server.taskListRequests.push({ status: 200 });
      await json(200, {
        tasks: [...server.assignedIds].map((id) => server.tasks.get(id)),
      });
    } else if (path === '/tasks' && req.method() === 'POST') {
      const body = req.postDataJSON() as { spaceId: string; title: string };
      server.creates.push(body.title);
      if (
        body.spaceId !== PLAINSPACE_SPACE.id &&
        body.spaceId !== PLAINSPACE_SPACE.slug
      ) {
        await json(404, { error: 'Space not found' });
        return;
      }
      if (server.isCreateServerError) {
        await json(500, { error: 'Internal error' });
        return;
      }
      const task = server.addAssignedTask(`created-${server.creates.length}`, body.title);
      await json(201, { task });
    } else if (path === '/claimable-tasks') {
      await json(200, { tasks: [] });
    } else if (taskMatch && req.method() === 'GET') {
      const task = assignedTask(taskMatch[1]);
      await (task ? json(200, { task }) : json(404, { error: 'Task not found' }));
    } else if (taskMatch && req.method() === 'PATCH') {
      const id = taskMatch[1];
      const body = req.postDataJSON() as Record<string, unknown>;
      const answer = async (status: number, resBody: unknown): Promise<void> => {
        server.patches.push({ id, body, status });
        await json(status, resBody);
        if (status === 200) {
          server.afterPatch?.();
        }
      };
      server.beforePatch?.();
      if (server.isPatchServerError) {
        await answer(500, { error: 'Internal error' });
        return;
      }
      if (server.patchConflictError) {
        await answer(409, { error: server.patchConflictError });
        return;
      }
      const task = assignedTask(id);
      if (!task) {
        await answer(404, { error: 'Task not found' });
        return;
      }
      if (server.isOldServer) {
        if (typeof body['done'] !== 'boolean') {
          await answer(422, { error: 'Invalid request. Expected { done: boolean }' });
          return;
        }
        server.remoteEdit(id, { done: body['done'] as boolean });
        await answer(200, { task: server.tasks.get(id) });
        return;
      }
      const title = body['title'];
      if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
        await answer(422, { error: 'Validation failed' });
        return;
      }
      const scheduledAt = body['scheduledAt'] as string | null | undefined;
      // Unscheduling a repeating task would drop its rule for the whole space.
      if (scheduledAt === null && task.isRecurring) {
        await answer(409, { error: 'repeat_requires_remind_at' });
        return;
      }
      server.remoteEdit(id, {
        ...(typeof body['done'] === 'boolean' ? { done: body['done'] } : {}),
        ...(typeof title === 'string' ? { title } : {}),
        // Stored as a timestamp and answered as UTC ISO, whatever offset came in.
        ...(scheduledAt !== undefined
          ? { scheduledAt: scheduledAt && new Date(scheduledAt).toISOString() }
          : {}),
      });
      await answer(200, { task: server.tasks.get(id) });
    } else if (taskMatch && req.method() === 'DELETE') {
      server.assignedIds.delete(taskMatch[1]);
      await route.fulfill({ status: 204, headers: cors });
    } else {
      await json(404, { error: 'Not found' });
    }
  });
  return server;
};

/**
 * Adds a Plainspace provider bound to the given project through the issue
 * panel's setup tab, then closes the panel. It polls in the background
 * ('always' mode) and imports the tasks assigned to me into that project.
 */
export const addPlainspaceProvider = async (
  page: Page,
  projectName: string | RegExp,
): Promise<void> => {
  await page.locator('.e2e-toggle-issue-provider-panel').click();
  await expect(page.locator('issue-panel')).toBeVisible();
  await page.locator('issue-panel .mat-mdc-tab').last().click();
  await page.getByRole('button', { name: 'Plainspace', exact: true }).click();
  const editDialog = page.locator('dialog-edit-issue-provider');
  await editDialog.locator('input[id*="host"]').fill(PLAINSPACE_HOST);
  await editDialog.locator('input[id*="spaceId"]').fill(PLAINSPACE_SPACE.id);
  await editDialog.locator('input[id*="token"]').fill('pat_e2e');
  await editDialog.getByRole('button', { name: /Advanced Config/i }).click();
  await editDialog.locator('mat-select[id*="defaultProjectId"]').click();
  await page.getByRole('option', { name: projectName }).click();
  await editDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editDialog).toBeHidden();
  await page.locator('.e2e-toggle-issue-provider-panel').click();
};

/** Successful `/tasks` polls so far. */
export const successfulPolls = (server: FakePlainspace): number =>
  server.taskListRequests.filter((r) => r.status === 200).length;

/**
 * Waits until `count` more successful `/tasks` requests arrived after `since`
 * (a `successfulPolls` count), plus a short settle for the app to apply what
 * it got. After a load, the update poll and the import poll each request once.
 */
export const waitForPollAfter = async (
  page: Page,
  server: FakePlainspace,
  since: number,
  count = 2,
): Promise<void> => {
  await expect
    .poll(() => successfulPolls(server), { timeout: 30000 })
    .toBeGreaterThanOrEqual(since + count);
  // Deliberate: the app applies the poll's result after the response arrives.
  await page.waitForTimeout(1000);
};
