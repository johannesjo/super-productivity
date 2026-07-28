import { inject, Injectable } from '@angular/core';
import { SearchQueryParams } from '../../pages/search-page/search-page.model';
import { devError } from '../../util/dev-error';
import { TaskService } from '../../features/tasks/task.service';
import { Router } from '@angular/router';
import { Task } from '../../features/tasks/task.model';
import { INBOX_PROJECT } from '../../features/project/project.const';
import { getDbDateStr } from '../../util/get-db-date-str';
import { DateService } from '../../core/date/date.service';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { Log } from '../../core/log';
import { LayoutService } from '../layout/layout.service';
import { recordSearchNavDebug } from '../../util/search-nav-debug';
import { Store } from '@ngrx/store';
import { RootState } from '../../root-store/root-state';
import { selectTaskEntities } from '../../features/tasks/store/task.selectors';
import { selectProjectFeatureState } from '../../features/project/store/project.selectors';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';

interface NavTarget {
  location: string;
  /** Project the task must be (re-)listed in, or `null` when nothing is broken. */
  repairTargetProjectId: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class NavigateToTaskService {
  private _store = inject<Store<RootState>>(Store);
  private _taskService = inject(TaskService);
  private _router = inject(Router);
  private _snackService = inject(SnackService);
  private _dateService = inject(DateService);
  private _layoutService = inject(LayoutService);
  private _taskEntities = this._store.selectSignal(selectTaskEntities);
  private _projectState = this._store.selectSignal(selectProjectFeatureState);

  async navigate(taskId: string, isArchiveTask: boolean = false): Promise<void> {
    try {
      const task = await this._taskService.getByIdFromEverywhere(taskId);
      if (!task) {
        throw new Error(`Task with id ${taskId} not found`);
      }
      const contextTask = await this._getContextTask(task, isArchiveTask);
      const { location, repairTargetProjectId } = this._resolveNavTarget(
        contextTask,
        isArchiveTask,
      );
      if (!location) {
        // Never fall through with an empty location: `''.startsWith` would make
        // the same-context check below always true and swallow the navigation.
        throw new Error(`Could not resolve a location for task ${taskId}`);
      }
      // Perform the relationship self-heal here (not inside the resolver) so the
      // synced state mutation is an explicit navigation step, not a hidden side
      // effect of computing a URL. Must run before the same-context check below
      // so the task is added to its project list in either branch. (#8780)
      if (repairTargetProjectId) {
        this._repairProjectMembership(contextTask.id, repairTargetProjectId);
      }
      recordSearchNavDebug('navigateToTask:start', {
        taskId,
        isArchiveTask,
        currentUrl: this._router.url,
        location,
        parentId: task.parentId || null,
        projectId: task.projectId || null,
        firstTagId: task.tagIds?.[0] || null,
      });

      if (this._router.url.startsWith(location)) {
        recordSearchNavDebug('navigateToTask:sameContext', {
          taskId,
          currentUrl: this._router.url,
          location,
        });
        this._focusTaskElement(taskId);
        return;
      }

      // Route-change path: focus is handed off to the destination view via the
      // `focusItem` query param (AppComponent), which owns its own reveal/retry.
      // The explicit onFailure error snack is only wired to the same-context
      // branch above; every location we route to here is one the task renders in
      // — either it already lists the task, or the repair above just added it.
      const queryParams: SearchQueryParams = { focusItem: taskId };
      if (isArchiveTask) {
        queryParams.dateStr = await this._getArchivedDate(task);
      } else {
        queryParams.isInBacklog = this._isInBacklog(contextTask);
      }
      recordSearchNavDebug('navigateToTask:routeChange', {
        taskId,
        location,
        queryParams,
      });
      await this._router.navigate([location], { queryParams });
    } catch (err) {
      recordSearchNavDebug('navigateToTask:error', {
        taskId,
        isArchiveTask,
        error: err instanceof Error ? err.message : String(err),
      });
      Log.err(err);
      this._showNavErrorSnack();
    }
  }

  /** For a subtask, the top-level parent that owns the destination context. */
  private async _getContextTask(task: Task, isArchiveTask: boolean): Promise<Task> {
    if (!task.parentId) {
      return task;
    }
    const parentTask = await this._taskService.getByIdFromEverywhere(
      task.parentId,
      isArchiveTask,
    );
    return parentTask ?? task;
  }

  /**
   * Pure resolver: computes the navigation location and any project relationship
   * that must be repaired — WITHOUT mutating state. The caller (`navigate`)
   * performs the repair, keeping this a side-effect-free "where does this task
   * live?" query.
   *
   * Only a location the task cannot render in warrants a repair, because the
   * repair is a synced write triggered by a read-only navigation. Today
   * membership comes from `dueDay`/`dueWithTime` and tag membership from
   * `task.tagIds` — neither depends on a project's ordering array — so those
   * routes are left untouched. (#8780)
   */
  private _resolveNavTarget(task: Task, isArchiveTask: boolean): NavTarget {
    const tasksOrWorklog = isArchiveTask ? 'history' : 'tasks';

    if (!isArchiveTask && this._isDueToday(task)) {
      return {
        location: `/tag/${TODAY_TAG.id}/${tasksOrWorklog}`,
        repairTargetProjectId: null,
      };
    }

    if (task.projectId) {
      // A project's main/backlog list renders from its ordering arrays, so a
      // task missing from both is unreachable there and must be re-listed.
      const repairTargetProjectId = isArchiveTask
        ? null
        : this._getProjectMembershipRepairTarget(task.id);
      return {
        location: `/project/${repairTargetProjectId ?? task.projectId}/${tasksOrWorklog}`,
        repairTargetProjectId,
      };
    }

    if (task.tagIds?.length > 0 && task.tagIds[0]) {
      return {
        location: `/tag/${task.tagIds[0]}/${tasksOrWorklog}`,
        repairTargetProjectId: null,
      };
    }

    if (!isArchiveTask) {
      // No project, no tag, and not due today: the task's id is in no work
      // context's ordering array, so it renders in no list view. Re-home it into
      // the Inbox so navigation can actually reveal it. An orphaned subtask whose
      // parent could not be loaded is routed but never re-homed as a top-level
      // task, which would corrupt the parent/child link. (#8780)
      return {
        location: `/project/${INBOX_PROJECT.id}/${tasksOrWorklog}`,
        repairTargetProjectId: task.parentId ? null : INBOX_PROJECT.id,
      };
    }

    devError("Couldn't find task location");
    return { location: '', repairTargetProjectId: null };
  }

  /**
   * Returns the project the task must be (re-)listed in, or `null` when its
   * project relationship is intact. Reads live store state synchronously so the
   * resolver and the repair below act on the very same snapshot — there is no
   * await in between for the task to move through.
   */
  private _getProjectMembershipRepairTarget(taskId: string): string | null {
    // Deliberately the LIVE entity, not the task handed to the resolver: that one
    // can come from the archive, which is legitimately absent from project lists.
    const task = this._taskEntities()[taskId];
    if (task?.id !== taskId || task.parentId || !task.projectId) {
      return null;
    }
    const candidate = this._projectState().entities[task.projectId];
    // Entity dictionaries inherit from Object.prototype — require the stored
    // entity to identify itself before trusting it.
    const owningProject = candidate?.id === task.projectId ? candidate : undefined;
    if (!owningProject) {
      // Dangling projectId: the owning project is gone, so re-home to the Inbox.
      return INBOX_PROJECT.id;
    }
    const isListed =
      (owningProject.taskIds ?? []).includes(taskId) ||
      (owningProject.backlogTaskIds ?? []).includes(taskId);
    return isListed ? null : owningProject.id;
  }

  private _repairProjectMembership(taskId: string, targetProjectId: string): void {
    const task = this._taskEntities()[taskId];
    if (task?.id !== taskId || task.parentId) {
      return;
    }
    const targetProject = this._projectState().entities[targetProjectId];
    if (targetProject?.id !== targetProjectId) {
      return;
    }

    if (task.projectId === targetProjectId) {
      // Only the root-list relationship is broken. Omitting projectMoveSubTaskIds
      // keeps this a single-entity op AND leaves the synced move footprint
      // undefined, so replaying clients derive the task family from their own
      // state. Passing `[]` instead would mint a one-element footprint that means
      // "relocate the root alone" and would strand subtasks in the old project.
      this._store.dispatch(
        TaskSharedActions.updateTask({
          task: {
            id: taskId,
            changes: { projectId: targetProjectId },
          },
        }),
      );
      return;
    }

    // A real re-home must move the complete task family.
    this._taskService.update(taskId, { projectId: targetProjectId });
  }

  private _showNavErrorSnack(): void {
    this._snackService.open({
      type: 'ERROR',
      msg: T.GLOBAL_SNACK.NAVIGATE_TO_TASK_ERR,
    });
  }

  private _isDueToday(task: Task): boolean {
    if (task.dueWithTime) {
      return this._dateService.isToday(task.dueWithTime);
    }
    return task.dueDay === this._dateService.todayStr();
  }

  private _focusTaskElement(taskId: string): void {
    // Never swallow silently: if the task never becomes focusable in the current
    // context, surface the error instead of leaving the user on the wrong view.
    this._layoutService.focusTaskInViewWhenReady(taskId, undefined, () => {
      recordSearchNavDebug('navigateToTask:focusFailed', { taskId });
      this._showNavErrorSnack();
    });
  }

  private _isInBacklog(task: Task): boolean {
    if (!task.projectId) return false;
    const project = this._projectState().entities[task.projectId];
    return project?.id === task.projectId
      ? (project.backlogTaskIds ?? []).includes(task.id)
      : false;
  }

  private async _getArchivedDate(task: Task): Promise<string> {
    let dateStr = task.timeSpentOnDay ? Object.keys(task.timeSpentOnDay)[0] : undefined;
    if (dateStr) return dateStr;

    if (task.parentId) {
      const tasks = await this._taskService.getArchivedTasks();
      const parentTask = tasks.find((innerTask) => innerTask.id === task.parentId);
      if (parentTask && parentTask.timeSpentOnDay) {
        dateStr = Object.keys(parentTask.timeSpentOnDay)[0];
        return dateStr ?? getDbDateStr(parentTask.created);
      }
    }

    return getDbDateStr(task.created);
  }
}
