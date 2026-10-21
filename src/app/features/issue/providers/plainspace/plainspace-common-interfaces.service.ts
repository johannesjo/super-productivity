import { Injectable, inject } from '@angular/core';
import { firstValueFrom, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Task, TaskCopy } from '../../../tasks/task.model';
import { BaseIssueProviderService } from '../../base/base-issue-provider.service';
import { IssueData, IssueDataReduced, SearchResultItem } from '../../issue.model';
import { PLAINSPACE_POLL_INTERVAL } from './plainspace.const';
import { PlainspaceCfg } from './plainspace.model';
import { PlainspaceApiService } from './plainspace-api.service';
import { PlainspaceSyncAdapterService } from './plainspace-sync-adapter.service';
import { PlainspaceIssue } from './plainspace-issue.model';
import {
  isPlainspaceAuthError,
  isPlainspaceUnreachableError,
  PlainspaceConnectionStateService,
} from './plainspace-connection-state.service';

@Injectable({
  providedIn: 'root',
})
export class PlainspaceCommonInterfacesService extends BaseIssueProviderService<PlainspaceCfg> {
  private readonly _plainspaceApiService = inject(PlainspaceApiService);
  private readonly _syncAdapter = inject(PlainspaceSyncAdapterService);
  private readonly _connectionState = inject(PlainspaceConnectionStateService);

  readonly providerKey = 'PLAINSPACE' as const;
  readonly pollInterval: number = PLAINSPACE_POLL_INTERVAL;

  isEnabled(cfg: PlainspaceCfg): boolean {
    return !!cfg && cfg.isEnabled && !!cfg.host && !!cfg.spaceId && !!cfg.token;
  }

  testConnection(cfg: PlainspaceCfg): Promise<boolean> {
    return firstValueFrom(
      this._plainspaceApiService.getMe$(cfg).pipe(map((res) => !!res)),
    ).then((result) => result ?? false);
  }

  issueLink(issueId: string | number, issueProviderId: string): Promise<string> {
    // The canonical link (`{origin}/{slug}/item/{id}`) comes from the task's own
    // `url`; fall back to the host root if the task can't be fetched (offline).
    return firstValueFrom(
      this._getCfgOnce$(issueProviderId).pipe(
        switchMap((cfg) =>
          this._plainspaceApiService.getById$(String(issueId), cfg).pipe(
            catchError(() => of(null)),
            map((issue) => issue?.url || `${cfg.host}`),
          ),
        ),
      ),
    ).then((result) => result ?? '');
  }

  getAddTaskData(
    issue: PlainspaceIssue,
  ): Partial<Readonly<TaskCopy>> & { title: string } {
    // Import Plainspace's `scheduledAt` as the SP task's scheduled time so it
    // shows in the app. A provider-supplied `dueWithTime` is routed by the import
    // pipeline through `addAndSchedule` (sets the time + a reminder + Today
    // membership). Poll updates keep it in sync via the override below.
    const dueWithTime = issue.scheduledAt
      ? new Date(issue.scheduledAt).getTime()
      : undefined;
    return {
      title: issue.title,
      isDone: issue.isDone,
      issueWasUpdated: false,
      issueLastUpdated: new Date(issue.updatedAt).getTime(),
      ...(dueWithTime ? { dueWithTime } : {}),
      // Seed the last trustworthy remote values. Completion needs the baseline
      // for write-back; title and schedule remain provider-owned pull baselines.
      issueLastSyncedValues: this._syncAdapter.extractSyncValues(
        issue as unknown as Record<string, unknown>,
      ),
    };
  }

  /**
   * Plainspace owns the schedule for shared tasks, so — unlike the base, which
   * drops `dueWithTime` on poll to protect user-set schedules — we pull
   * `scheduledAt` into `dueWithTime` here. This schedules already-imported tasks
   * once they next change remotely and keeps recurring items in sync as the
   * server advances `scheduledAt` to the next occurrence.
   * Mirrors the CalDAV provider's date-on-poll override.
   */
  override async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: IssueData;
    issueTitle: string;
  } | null> {
    if (!task.issueProviderId || !task.issueId) {
      return null;
    }
    const cfg = await firstValueFrom(this._getCfgOnce$(task.issueProviderId));
    const issue = await this._tracked(
      task.issueProviderId,
      firstValueFrom(this._plainspaceApiService.getById$(task.issueId, cfg)),
    );
    return this._toFreshData(task, issue);
  }

  /**
   * Poll all of a provider's imported tasks at once. `GET /tasks` already returns
   * every task assigned to me in one call, so we fetch it once per provider and
   * diff locally — instead of the base's one `getById` HTTP request per task
   * (which is N redundant calls of the same data). A task that is no longer
   * assigned to me simply isn't in the response and is left untouched this cycle.
   * A failed request throws (the poll effect logs it quietly) instead of
   * yielding an empty list, so nothing here is ever computed from a failed poll.
   */
  override async getFreshDataForIssueTasks(
    tasks: Task[],
  ): Promise<{ task: Task; taskChanges: Partial<Task>; issue: IssueData }[]> {
    const tasksByProviderId = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.issueProviderId || !task.issueId) {
        continue;
      }
      const group = tasksByProviderId.get(task.issueProviderId) ?? [];
      group.push(task);
      tasksByProviderId.set(task.issueProviderId, group);
    }

    const updates: { task: Task; taskChanges: Partial<Task>; issue: IssueData }[] = [];
    for (const [providerId, providerTasks] of tasksByProviderId) {
      const cfg = await firstValueFrom(this._getCfgOnce$(providerId));
      const myTasks = await this._tracked(
        providerId,
        firstValueFrom(this._plainspaceApiService.getMyTasks$(cfg)),
      );
      const issuesById = new Map(myTasks.map((issue) => [issue.id, issue] as const));
      for (const task of providerTasks) {
        const fresh = this._toFreshData(task, issuesById.get(task.issueId!) ?? null);
        if (fresh) {
          updates.push({ task, taskChanges: fresh.taskChanges, issue: fresh.issue });
        }
      }
    }
    return updates;
  }

  private _toFreshData(
    task: Task,
    issue: PlainspaceIssue | null,
  ): { taskChanges: Partial<Task>; issue: IssueData; issueTitle: string } | null {
    if (!issue || new Date(issue.updatedAt).getTime() === task.issueLastUpdated) {
      return null;
    }
    return {
      taskChanges: {
        ...this.getAddTaskData(issue),
        // Explicit (incl. undefined to unschedule) — the base deletes this.
        dueWithTime: issue.scheduledAt
          ? new Date(issue.scheduledAt).getTime()
          : undefined,
        issueWasUpdated: true,
      },
      issue: issue as unknown as IssueData,
      issueTitle: issue.title,
    };
  }

  async getNewIssuesToAddToBacklog(
    issueProviderId: string,
    _allExistingIssueIds: string[],
  ): Promise<IssueDataReduced[]> {
    const cfg = await firstValueFrom(this._getCfgOnce$(issueProviderId));
    // Only tasks assigned to me become SP tasks; unclaimed tasks are claimed
    // explicitly via the claim pool, never auto-imported.
    try {
      return await this._tracked(
        issueProviderId,
        firstValueFrom(this._plainspaceApiService.getMyTasks$(cfg)),
      );
    } catch (err) {
      // Offline, a server outage or a rejected token: nothing to import this
      // tick. Kept quiet — the backlog poll would otherwise snack an error every
      // few minutes; a rejected token shows "reconnect" in the issue panel
      // instead. The caller only adds what it gets, so an empty answer here
      // imports nothing and removes nothing. Anything else keeps the snack.
      if (isPlainspaceUnreachableError(err) || isPlainspaceAuthError(err)) {
        return [];
      }
      throw err;
    }
  }

  override searchIssues(
    searchTerm: string,
    issueProviderId: string,
  ): Promise<SearchResultItem[]> {
    return this._tracked(
      issueProviderId,
      super.searchIssues(searchTerm, issueProviderId),
    );
  }

  /** Records whether the provider's token still works; never swallows errors. */
  private async _tracked<R>(providerId: string, request: Promise<R>): Promise<R> {
    try {
      const result = await request;
      this._connectionState.reportSuccess(providerId);
      return result;
    } catch (err) {
      this._connectionState.reportError(providerId, err);
      throw err;
    }
  }

  protected _apiGetById$(
    id: string | number,
    cfg: PlainspaceCfg,
  ): Observable<IssueData | null> {
    return this._plainspaceApiService.getById$(
      String(id),
      cfg,
    ) as Observable<IssueData | null>;
  }

  protected _apiSearchIssues$(
    searchTerm: string,
    cfg: PlainspaceCfg,
  ): Observable<SearchResultItem[]> {
    return this._plainspaceApiService.searchIssues$(searchTerm, cfg);
  }

  protected _formatIssueTitleForSnack(issue: IssueData): string {
    return (issue as PlainspaceIssue).title;
  }

  protected _getIssueLastUpdated(issue: IssueData): number {
    return new Date((issue as PlainspaceIssue).updatedAt).getTime();
  }
}
