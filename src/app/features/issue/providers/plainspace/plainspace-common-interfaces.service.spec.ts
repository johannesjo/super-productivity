import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PlainspaceCommonInterfacesService } from './plainspace-common-interfaces.service';
import { PlainspaceApiService } from './plainspace-api.service';
import { PlainspaceIssue } from './plainspace-issue.model';
import { IssueProviderService } from '../../issue-provider.service';
import { Task } from '../../../tasks/task.model';
import { PlainspaceConnectionStateService } from './plainspace-connection-state.service';

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
  // as 'no-baseline'. The provider-owned pulled fields remain alongside it.
  it('getAddTaskData seeds completion and pulled field baselines', () => {
    const data = service.getAddTaskData(issue('2026-01-02T09:00:00.000Z', true));
    expect(data.title).toBe('Buy milk');
    expect(data.isDone).toBe(true);
    expect(data.issueLastSyncedValues).toEqual({
      isDone: true,
      title: 'Buy milk',
      scheduledAt: '2026-01-02T09:00:00.000Z',
    });
  });

  it('getAddTaskData baseline carries a null scheduledAt for unscheduled tasks', () => {
    const data = service.getAddTaskData(issue(null));
    expect(data.issueLastSyncedValues).toEqual({
      isDone: false,
      title: 'Buy milk',
      scheduledAt: null,
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

  // Gap 3: a failed poll is never read as "no tasks", and only a rejected token
  // (not being offline) asks the user to reconnect.
  describe('failed polls', () => {
    const httpError = (status: number): HttpErrorResponse =>
      new HttpErrorResponse({ status, url: 'https://plainspace.org/api/integration' });
    let state: PlainspaceConnectionStateService;

    beforeEach(() => {
      state = TestBed.inject(PlainspaceConnectionStateService);
      spyOn(
        service as unknown as { _getCfgOnce$: (id: string) => unknown },
        '_getCfgOnce$',
      ).and.returnValue(of({}));
    });
    const failMyTasks = (status: number): void => {
      (api as unknown as { getMyTasks$: unknown }).getMyTasks$ = () =>
        throwError(() => httpError(status));
    };
    const tasks = [
      { issueProviderId: 'p1', issueId: 't1', issueLastUpdated: 0 },
    ] as Task[];

    it('bulk poll rejects instead of returning no updates', async () => {
      failMyTasks(0);
      await expectAsync(service.getFreshDataForIssueTasks(tasks)).toBeRejected();
      expect(state.rejectedProviderIds().size).toBe(0);
    });

    it('marks the provider for reconnect on a 401 and clears it on success', async () => {
      failMyTasks(401);
      await expectAsync(service.getFreshDataForIssueTasks(tasks)).toBeRejected();
      expect(state.rejectedProviderIds().has('p1')).toBe(true);

      (api as unknown as { getMyTasks$: unknown }).getMyTasks$ = () => of([]);
      await service.getFreshDataForIssueTasks(tasks);
      expect(state.rejectedProviderIds().has('p1')).toBe(false);
    });

    it('single-task poll rejects on an offline fetch', async () => {
      (api as unknown as { getById$: unknown }).getById$ = () =>
        throwError(() => httpError(0));
      await expectAsync(service.getFreshDataForIssueTask(tasks[0])).toBeRejected();
    });

    [0, 503, 401].forEach((status) => {
      it(`backlog import adds nothing and stays quiet on a ${status}`, async () => {
        failMyTasks(status);
        expect(await service.getNewIssuesToAddToBacklog('p1', [])).toEqual([]);
        expect(state.rejectedProviderIds().has('p1')).toBe(status === 401);
      });
    });

    it('backlog import keeps the failure snack for an unexpected error', async () => {
      failMyTasks(400);
      await expectAsync(service.getNewIssuesToAddToBacklog('p1', [])).toBeRejected();
    });

    it('issueLink falls back to the host when the task cannot be fetched', async () => {
      (service as unknown as { _getCfgOnce$: jasmine.Spy })._getCfgOnce$.and.returnValue(
        of({ host: 'https://plainspace.org' }),
      );
      (api as unknown as { getById$: unknown }).getById$ = () =>
        throwError(() => httpError(0));
      expect(await service.issueLink('t1', 'p1')).toBe('https://plainspace.org');
    });
  });
});
