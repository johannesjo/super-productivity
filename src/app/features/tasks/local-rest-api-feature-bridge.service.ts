import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { LocalRestApiFeatureBridge } from '../../core/electron/local-rest-api-feature-bridge';
import { TaskLog } from '../../core/log';
import { IssueService } from '../issue/issue.service';
import { IssueProviderKey } from '../issue/issue.model';
import { syncTimeSpent } from '../time-tracking/store/time-tracking.actions';
import { addSubTask } from './store/task.actions';
import { Task } from './task.model';
import { TaskService } from './task.service';
import { TaskTimeSyncService } from './task-time-sync.service';

/** Features-side implementation of `LOCAL_REST_API_FEATURE_BRIDGE`. */
@Injectable()
export class LocalRestApiFeatureBridgeService implements LocalRestApiFeatureBridge {
  private readonly _issueService = inject(IssueService);
  private readonly _taskService = inject(TaskService);
  private readonly _taskTimeSync = inject(TaskTimeSyncService);
  private readonly _store = inject(Store);

  issueLink(
    issueType: IssueProviderKey,
    issueId: string | number,
    issueProviderId: string,
  ): Promise<string> {
    return this._issueService.issueLink(issueType, issueId, issueProviderId);
  }

  /**
   * `TaskService.addSubTaskTo` with short syntax switched off. Kept here
   * rather than as a flag on the service, which is already over the size cap.
   */
  addLiteralSubTask(parentId: string, additional: Partial<Task>): string {
    const task = this._taskService.createNewTaskWithDefaults({
      title: additional.title || '',
      additional: { dueDay: additional.dueDay || undefined, ...additional },
    });
    TaskLog.log('addSubTaskTo', { taskId: task.id, parentId });
    this._store.dispatch(addSubTask({ task, parentId, isIgnoreShortSyntax: true }));
    return task.id;
  }

  /** Same steps as `TaskService.addTimeSpentAndSync`, but for any day. */
  addTimeSpentOnDay(task: Task, durationMs: number, date: string): void {
    this._taskTimeSync.flushOne(task.id);
    this._taskService.addTimeSpent(task, durationMs, date);
    this._store.dispatch(syncTimeSpent({ taskId: task.id, date, duration: durationMs }));
  }
}
