import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PlainspaceCommonInterfacesService } from './plainspace-common-interfaces.service';
import { PlainspaceApiService } from './plainspace-api.service';
import { PlainspaceIssue } from './plainspace-issue.model';
import { IssueProviderService } from '../../issue-provider.service';
import { Task } from '../../../tasks/task.model';

describe('PlainspaceCommonInterfacesService', () => {
  let service: PlainspaceCommonInterfacesService;
  let api: PlainspaceApiService;

  const issue = (scheduledAt: string | null, isDone = false): PlainspaceIssue => ({
    id: 't1',
    title: 'Buy milk',
    isDone,
    updatedAt: '2026-01-02T00:00:00.000Z',
    url: 'https://plainspace.org/p/item/t1',
    projectId: 'space-1',
    scheduledAt,
    isRecurring: false,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlainspaceCommonInterfacesService,
        // extractSyncValues is pure, so the API stub is never called here.
        { provide: PlainspaceApiService, useValue: {} },
        { provide: IssueProviderService, useValue: {} },
      ],
    });
    service = TestBed.inject(PlainspaceCommonInterfacesService);
    api = TestBed.inject(PlainspaceApiService);
  });

  // Without a seeded baseline, computePushDecisions skips completion write-back
  // as 'no-baseline'. The pulled fields and binding provenance remain alongside it.
  it('getAddTaskData seeds completion and remote provenance baselines', () => {
    const data = service.getAddTaskData(issue('2026-01-02T09:00:00.000Z', true));
    expect(data.title).toBe('Buy milk');
    expect(data.isDone).toBe(true);
    expect(data.issueLastSyncedValues).toEqual({
      isDone: true,
      title: 'Buy milk',
      scheduledAt: '2026-01-02T09:00:00.000Z',
      projectId: 'space-1',
      url: 'https://plainspace.org/p/item/t1',
    });
  });

  it('getAddTaskData baseline carries a null scheduledAt for unscheduled tasks', () => {
    const data = service.getAddTaskData(issue(null));
    expect(data.issueLastSyncedValues).toEqual({
      isDone: false,
      title: 'Buy milk',
      scheduledAt: null,
      projectId: 'space-1',
      url: 'https://plainspace.org/p/item/t1',
    });
  });

  it('getAddTaskData imports scheduledAt as dueWithTime (schedule shows in the app)', () => {
    const iso = '2026-01-02T09:00:00.000Z';
    const data = service.getAddTaskData(issue(iso));
    expect(data.dueWithTime).toBe(new Date(iso).getTime());
  });

  it('getAddTaskData leaves dueWithTime unset for unscheduled tasks', () => {
    const data = service.getAddTaskData(issue(null));
    expect('dueWithTime' in data).toBe(false);
  });

  describe('getFreshDataForIssueTask (poll pulls scheduledAt → dueWithTime)', () => {
    const stubCfg = (): void => {
      spyOn(
        service as unknown as { _getCfgOnce$: (id: string) => unknown },
        '_getCfgOnce$',
      ).and.returnValue(of({}));
    };
    const setRemote = (i: PlainspaceIssue): void => {
      (api as unknown as { getById$: () => unknown }).getById$ = () => of(i);
    };

    it('pulls dueWithTime when the remote task changed', async () => {
      setRemote(issue('2026-01-02T09:00:00.000Z'));
      stubCfg();
      const task = { issueProviderId: 'p1', issueId: 't1', issueLastUpdated: 0 } as Task;
      const res = await service.getFreshDataForIssueTask(task);
      expect(res?.taskChanges.dueWithTime).toBe(
        new Date('2026-01-02T09:00:00.000Z').getTime(),
      );
      expect(res?.taskChanges.issueWasUpdated).toBe(true);
    });

    it('clears dueWithTime when the remote task was unscheduled', async () => {
      setRemote(issue(null));
      stubCfg();
      const task = { issueProviderId: 'p1', issueId: 't1', issueLastUpdated: 0 } as Task;
      const res = await service.getFreshDataForIssueTask(task);
      expect(res?.taskChanges.dueWithTime).toBeUndefined();
    });

    // Plainspace → SP completion sync: when a task is completed in Plainspace, the
    // poll must carry isDone:true into the task changes so SP marks it done.
    it('pulls isDone:true when the remote task was completed', async () => {
      setRemote(issue(null, true));
      stubCfg();
      const task = { issueProviderId: 'p1', issueId: 't1', issueLastUpdated: 0 } as Task;
      const res = await service.getFreshDataForIssueTask(task);
      expect(res?.taskChanges.isDone).toBe(true);
    });

    it('pulls isDone:false when the remote task was reopened', async () => {
      setRemote(issue(null, false));
      stubCfg();
      const task = { issueProviderId: 'p1', issueId: 't1', issueLastUpdated: 0 } as Task;
      const res = await service.getFreshDataForIssueTask(task);
      expect(res?.taskChanges.isDone).toBe(false);
    });

    it('returns null when the remote task is unchanged', async () => {
      setRemote(issue('2026-01-02T09:00:00.000Z'));
      stubCfg();
      const task = {
        issueProviderId: 'p1',
        issueId: 't1',
        issueLastUpdated: new Date('2026-01-02T00:00:00.000Z').getTime(),
      } as Task;
      expect(await service.getFreshDataForIssueTask(task)).toBeNull();
    });
  });

  describe('getFreshDataForIssueTasks (bulk poll = one fetch per provider)', () => {
    it('fetches all tasks once via getMyTasks$, not one getById per task', async () => {
      spyOn(
        service as unknown as { _getCfgOnce$: (id: string) => unknown },
        '_getCfgOnce$',
      ).and.returnValue(of({}));
      const t1 = { ...issue('2026-01-02T09:00:00.000Z'), id: 't1' };
      const t2 = { ...issue('2026-01-03T09:00:00.000Z'), id: 't2' };
      const getMyTasks$ = jasmine.createSpy('getMyTasks$').and.returnValue(of([t1, t2]));
      const getById$ = jasmine.createSpy('getById$');
      (api as unknown as { getMyTasks$: unknown }).getMyTasks$ = getMyTasks$;
      (api as unknown as { getById$: unknown }).getById$ = getById$;

      const tasks = [
        { issueProviderId: 'p1', issueId: 't1', issueLastUpdated: 0 },
        { issueProviderId: 'p1', issueId: 't2', issueLastUpdated: 0 },
      ] as Task[];
      const updates = await service.getFreshDataForIssueTasks(tasks);

      expect(getMyTasks$).toHaveBeenCalledTimes(1);
      expect(getById$).not.toHaveBeenCalled();
      expect(updates.map((u) => u.task.issueId)).toEqual(['t1', 't2']);
    });

    it('skips tasks that are no longer returned (e.g. unassigned from me)', async () => {
      spyOn(
        service as unknown as { _getCfgOnce$: (id: string) => unknown },
        '_getCfgOnce$',
      ).and.returnValue(of({}));
      (api as unknown as { getMyTasks$: unknown }).getMyTasks$ = () =>
        of([{ ...issue('2026-01-02T09:00:00.000Z'), id: 't1' }]);
      const tasks = [
        { issueProviderId: 'p1', issueId: 't1', issueLastUpdated: 0 },
        { issueProviderId: 'p1', issueId: 'gone', issueLastUpdated: 0 },
      ] as Task[];
      const updates = await service.getFreshDataForIssueTasks(tasks);
      expect(updates.map((u) => u.task.issueId)).toEqual(['t1']);
    });

    // Plainspace → SP completion sync via the bulk poll path (the one the
    // auto-poll actually uses): a remotely-completed task must carry isDone:true.
    it('carries isDone:true for a task completed remotely', async () => {
      spyOn(
        service as unknown as { _getCfgOnce$: (id: string) => unknown },
        '_getCfgOnce$',
      ).and.returnValue(of({}));
      (api as unknown as { getMyTasks$: unknown }).getMyTasks$ = () =>
        of([{ ...issue(null, true), id: 't1' }]);
      const tasks = [
        { issueProviderId: 'p1', issueId: 't1', issueLastUpdated: 0 },
      ] as Task[];
      const updates = await service.getFreshDataForIssueTasks(tasks);
      expect(updates[0]?.taskChanges.isDone).toBe(true);
    });
  });

  describe('getRemovedRemoteTaskCandidates (orphan detection by list-diff)', () => {
    it('does not expose candidates through the automatic removal hook', () => {
      expect(
        (
          service as unknown as {
            getRemovedRemoteTasks?: (tasks: Task[]) => Promise<Task[]>;
          }
        ).getRemovedRemoteTasks,
      ).toBeUndefined();
    });

    const task = (
      issueId: string,
      remoteProjectId: string | null = 'space-1',
      remoteUrl = `https://plainspace.org/space/item/${issueId}`,
    ): Task =>
      ({
        issueProviderId: 'p1',
        issueId,
        issueLastUpdated: 0,
        issueLastSyncedValues: remoteProjectId
          ? { projectId: remoteProjectId, url: remoteUrl }
          : undefined,
      }) as Task;

    const setSnapshot = ({
      ids,
      spaceId = 'space-1',
      host = 'https://plainspace.org',
      spaces = [{ id: spaceId, name: 'Space', slug: 'space' }],
    }: {
      ids: string[] | null;
      spaceId?: string;
      host?: string;
      spaces?: { id: string; name: string; slug: string }[] | null;
    }): void => {
      spyOn(
        service as unknown as { _getCfgOnce$: (id: string) => unknown },
        '_getCfgOnce$',
      ).and.returnValue(of({ host, spaceId }));
      (
        api as unknown as {
          getAssignedTaskSnapshot$: () => unknown;
          getSpaces$: () => unknown;
        }
      ).getAssignedTaskSnapshot$ = () =>
        of(
          ids?.map((id) => ({
            ...issue(null),
            id,
            projectId: spaceId,
          })) ?? null,
        );
      (
        api as unknown as {
          getAssignedTaskSnapshot$: () => unknown;
          getSpaces$: () => unknown;
        }
      ).getSpaces$ = () => of(spaces);
    };

    it('returns tasks missing from my task list (deleted or reassigned away)', async () => {
      setSnapshot({ ids: ['kept'] });
      const tasks = [task('kept'), task('gone')];
      const removed = await service.getRemovedRemoteTaskCandidates(tasks);
      expect(removed.map((t) => t.issueId)).toEqual(['gone']);
    });

    it('keeps tasks still in my list (done tasks stay in the list)', async () => {
      setSnapshot({ ids: ['a', 'b'] });
      const tasks = [task('a'), task('b')];
      expect(await service.getRemovedRemoteTaskCandidates(tasks)).toEqual([]);
    });

    it('trusts an empty snapshot only after independently verifying Space access', async () => {
      setSnapshot({ ids: [] });
      const gone = task('gone');
      expect(await service.getRemovedRemoteTaskCandidates([gone])).toEqual([gone]);
    });

    it('trusts a non-empty snapshot even when every previous task is gone', async () => {
      setSnapshot({ ids: ['new-task'] });
      const gone = task('gone');
      expect(await service.getRemovedRemoteTaskCandidates([gone])).toEqual([gone]);
    });

    it('preserves tasks when the assigned-task snapshot failed', async () => {
      setSnapshot({ ids: null });
      expect(await service.getRemovedRemoteTaskCandidates([task('a')])).toEqual([]);
    });

    it('preserves tasks when an empty snapshot cannot verify Space access', async () => {
      setSnapshot({ ids: [], spaces: null });
      expect(await service.getRemovedRemoteTaskCandidates([task('a')])).toEqual([]);
    });

    it('preserves tasks after access to the configured Space is lost', async () => {
      setSnapshot({
        ids: [],
        spaces: [{ id: 'other', name: 'Other', slug: 'other' }],
      });
      expect(await service.getRemovedRemoteTaskCandidates([task('a')])).toEqual([]);
    });

    it('preserves mirrors imported before the provider was rebound to another Space', async () => {
      setSnapshot({
        ids: ['new-space-task'],
        spaceId: 'space-2',
        spaces: [{ id: 'space-2', name: 'New Space', slug: 'new-space' }],
      });
      expect(
        await service.getRemovedRemoteTaskCandidates([task('old-task', 'space-1')]),
      ).toEqual([]);
    });

    it('preserves mirrors imported before the provider was rebound to another host', async () => {
      setSnapshot({
        ids: [],
        host: 'https://other.example',
        spaces: [{ id: 'space-1', name: 'Same ID', slug: 'same-id' }],
      });
      expect(
        await service.getRemovedRemoteTaskCandidates([
          task(
            'old-host-task',
            'space-1',
            'https://plainspace.org/space/item/old-host-task',
          ),
        ]),
      ).toEqual([]);
    });

    it('preserves tasks when Space access resolves ambiguously', async () => {
      setSnapshot({
        ids: [],
        spaceId: 'shared-key',
        spaces: [
          { id: 'shared-key', name: 'By ID', slug: 'first' },
          { id: 'other-id', name: 'By Slug', slug: 'shared-key' },
        ],
      });
      expect(await service.getRemovedRemoteTaskCandidates([task('ambiguous')])).toEqual(
        [],
      );
    });

    it('preserves tasks when a non-empty snapshot has an ambiguous Space binding', async () => {
      setSnapshot({
        ids: ['remote'],
        spaceId: 'shared-key',
        spaces: [
          { id: 'shared-key', name: 'By ID', slug: 'first' },
          { id: 'other-id', name: 'By Slug', slug: 'shared-key' },
        ],
      });
      expect(await service.getRemovedRemoteTaskCandidates([task('gone')])).toEqual([]);
    });

    it('resolves a slug-configured Space to its canonical project id', async () => {
      setSnapshot({
        ids: [],
        spaceId: 'space-slug',
        spaces: [{ id: 'space-uuid', name: 'Space', slug: 'space-slug' }],
      });
      const gone = task('gone', 'space-uuid');
      expect(await service.getRemovedRemoteTaskCandidates([gone])).toEqual([gone]);
    });

    it('preserves mirrors when the provider moves to another base path', async () => {
      setSnapshot({
        ids: [],
        host: 'https://example.com/new-base',
        spaces: [{ id: 'space-1', name: 'Same ID', slug: 'same-id' }],
      });
      expect(
        await service.getRemovedRemoteTaskCandidates([
          task(
            'old-base-task',
            'space-1',
            'https://example.com/old-base/space/item/old-base-task',
          ),
        ]),
      ).toEqual([]);
    });

    it('preserves mirrors for non-HTTP provider URLs', async () => {
      setSnapshot({ ids: [], host: 'file:///plainspace' });
      expect(
        await service.getRemovedRemoteTaskCandidates([
          task('opaque', 'space-1', 'file:///plainspace/space/item/opaque'),
        ]),
      ).toEqual([]);
    });

    it('preserves legacy mirrors without trustworthy remote Space provenance', async () => {
      setSnapshot({ ids: [] });
      expect(
        await service.getRemovedRemoteTaskCandidates([task('legacy', null)]),
      ).toEqual([]);
    });
  });
});
