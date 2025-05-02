import { inject, Injectable } from '@angular/core';
import { SearchQueryParams } from '../../features/search-bar/search-bar.model';
import { first } from 'rxjs/operators';
import { devError } from '../../util/dev-error';
import { TaskService } from '../../features/tasks/task.service';
import { ProjectService } from '../../features/project/project.service';
import { Router } from '@angular/router';
import { Task } from '../../features/tasks/task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';

@Injectable({
  providedIn: 'root',
})
export class NavigateToTaskService {
  private _taskService = inject(TaskService);
  private _projectService = inject(ProjectService);
  private _router = inject(Router);
  private _snackService = inject(SnackService);

  async navigate(taskId: string, isArchiveTask: boolean = false): Promise<void> {
    try {
      const task = await this._taskService.getByIdFromEverywhere(taskId);
      const location = await this._getLocation(task, isArchiveTask);

      const queryParams: SearchQueryParams = { focusItem: taskId };
      if (isArchiveTask) {
        queryParams.dateStr = await this._getArchivedDate(task);
        await this._router.navigate([location], { queryParams });
      } else {
        queryParams.isInBacklog = await this._isInBacklog(task);
        await this._router.navigate([location], { queryParams });
      }
    } catch (err) {
      console.error(err);
      this._snackService.open({
        type: 'ERROR',
        msg: T.GLOBAL_SNACK.NAVIGATE_TO_TASK_ERR,
      });
    }
  }

  private async _getLocation(task: Task, isArchiveTask: boolean): Promise<string> {
    const tasksOrWorklog = isArchiveTask ? 'worklog' : 'tasks';

    const taskToCheck = task.parentId
      ? await this._taskService.getByIdFromEverywhere(task.parentId, isArchiveTask)
      : task;

    if (taskToCheck.projectId) {
      return `/project/${taskToCheck.projectId}/${tasksOrWorklog}`;
    } else if (taskToCheck.tagIds[0]) {
      return `/tag/${taskToCheck.tagIds[0]}/${tasksOrWorklog}`;
    } else {
      devError("Couldn't find task location");
      return '';
    }
  }

  private async _isInBacklog(task: Task): Promise<boolean> {
    if (!task.projectId) return false;
    const projects = await this._projectService.list$.pipe(first()).toPromise();
    const project = projects.find((p) => p.id === task.projectId);
    return project ? project.backlogTaskIds.includes(task.id) : false;
  }

  private async _getArchivedDate(task: Task): Promise<string> {
    let dateStr = Object.keys(task.timeSpentOnDay)[0];
    if (dateStr) return dateStr;

    if (task.parentId) {
      const tasks = await this._taskService.getArchivedTasks();
      const parentTask = tasks.find(
        (innerTask) => innerTask.id === task.parentId,
      ) as Task;
      dateStr = Object.keys(parentTask.timeSpentOnDay)[0];
      return dateStr ?? getWorklogStr(parentTask.created);
    }

    return getWorklogStr(task.created);
  }
}
