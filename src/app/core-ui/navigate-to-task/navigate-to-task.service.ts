import { inject, Injectable } from '@angular/core';
import { SearchQueryParams } from '../../pages/search-page/search-page.model';
import { first } from 'rxjs/operators';
import { devError } from '../../util/dev-error';
import { TaskService } from '../../features/tasks/task.service';
import { ProjectService } from '../../features/project/project.service';
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

interface ProjectMembershipRepair {
  task: Task;
  projectId: string;
}

@Injectable({
  providedIn: 'root',
})
export class NavigateToTaskService {
  private _taskService = inject(TaskService);
  private _projectService = inject(ProjectService);
  private _router = inject(Router);
  private _snackService = inject(SnackService);
  private _dateService = inject(DateService);
  private _layoutService = inject(LayoutService);

  async navigate(taskId: string, isArchiveTask: boolean = false): Promise<void> {
    try {
      const task = await this._taskService.getByIdFromEverywhere(taskId);
      if (!task) {
        throw new Error(`Task with id ${taskId} not found`);
      }
      const { location, projectMembershipRepair, contextTask } =
        await this._resolveNavTarget(task, isArchiveTask);
      if (!location) {
        // Never fall through with an empty location: `''.startsWith` would make
        // the same-context check below always true and swallow the navigation.
        throw new Error(`Could not resolve a location for task ${taskId}`);
      }
      // Perform the relationship self-heal here (not inside the resolver) so the
      // synced state mutation is an explicit navigation step, not a hidden side
      // effect of computing a URL. Must run before the same-context check below
      // so the task is added to its project list in either branch. (#8780)
      if (projectMembershipRepair) {
        this._repairProjectMembership(projectMembershipRepair);
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
      // branch above; here a repair adds the task to its owning project's main
      // list, so it renders and focuses normally.
      const queryParams: SearchQueryParams = { focusItem: taskId };
      if (isArchiveTask) {
        queryParams.dateStr = await this._getArchivedDate(task);
      } else {
        queryParams.isInBacklog = await this._isInBacklog(contextTask);
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

  /**
   * Pure resolver: computes the navigation location and returns any top-level
   * project relationship that must be repaired — WITHOUT mutating state. The
   * caller (`navigate`) performs the repair, keeping this a side-effect-free
   * "where does this task live?" query. (#8780)
   */
  private async _resolveNavTarget(
    task: Task,
    isArchiveTask: boolean,
  ): Promise<{
    location: string;
    projectMembershipRepair: ProjectMembershipRepair | null;
    contextTask: Task;
  }> {
    const tasksOrWorklog = isArchiveTask ? 'history' : 'tasks';

    let taskToCheck = task;
    if (task.parentId) {
      const parentTask = await this._taskService.getByIdFromEverywhere(
        task.parentId,
        isArchiveTask,
      );
      if (parentTask) {
        taskToCheck = parentTask;
      }
    }

    const projectMembershipRepair = await this._getProjectMembershipRepair(
      taskToCheck,
      isArchiveTask,
    );
    if (projectMembershipRepair) {
      return {
        location: `/project/${projectMembershipRepair.projectId}/${tasksOrWorklog}`,
        projectMembershipRepair,
        contextTask: taskToCheck,
      };
    }

    if (!isArchiveTask && this._isDueToday(taskToCheck)) {
      return {
        location: `/tag/${TODAY_TAG.id}/${tasksOrWorklog}`,
        projectMembershipRepair: null,
        contextTask: taskToCheck,
      };
    }

    if (taskToCheck.projectId) {
      return {
        location: `/project/${taskToCheck.projectId}/${tasksOrWorklog}`,
        projectMembershipRepair: null,
        contextTask: taskToCheck,
      };
    } else if (taskToCheck.tagIds?.length > 0 && taskToCheck.tagIds[0]) {
      return {
        location: `/tag/${taskToCheck.tagIds[0]}/${tasksOrWorklog}`,
        projectMembershipRepair: null,
        contextTask: taskToCheck,
      };
    } else if (!isArchiveTask) {
      // An orphaned subtask whose parent could not be loaded cannot be repaired
      // as a top-level task here without corrupting the parent/child link.
      return {
        location: `/project/${INBOX_PROJECT.id}/${tasksOrWorklog}`,
        projectMembershipRepair: null,
        contextTask: taskToCheck,
      };
    } else {
      devError("Couldn't find task location");
      return {
        location: '',
        projectMembershipRepair: null,
        contextTask: taskToCheck,
      };
    }
  }

  private async _getProjectMembershipRepair(
    task: Task,
    isArchiveTask: boolean,
  ): Promise<ProjectMembershipRepair | null> {
    if (isArchiveTask || task.parentId) {
      return null;
    }
    if (!task.projectId) {
      return { task, projectId: INBOX_PROJECT.id };
    }

    const project = await this._projectService.getByIdOnce$(task.projectId).toPromise();
    if (!project) {
      return { task, projectId: INBOX_PROJECT.id };
    }
    if (!project.taskIds.includes(task.id) && !project.backlogTaskIds.includes(task.id)) {
      return { task, projectId: project.id };
    }
    return null;
  }

  private _repairProjectMembership({ task, projectId }: ProjectMembershipRepair): void {
    if (task.parentId) {
      return;
    }
    // Updating projectId to its current value is an intentional relationship
    // repair: the shared reducer restores missing project-list membership while
    // preserving an existing main-list/backlog position in one persistent op.
    this._taskService.update(task.id, { projectId });
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

  private async _isInBacklog(task: Task): Promise<boolean> {
    if (!task.projectId) return false;
    const projects = await this._projectService.list$.pipe(first()).toPromise();
    const project = projects.find((p) => p.id === task.projectId);
    return project ? project.backlogTaskIds.includes(task.id) : false;
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
