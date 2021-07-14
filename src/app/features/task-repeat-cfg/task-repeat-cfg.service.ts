import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  selectAllTaskRepeatCfgs,
  selectTaskRepeatCfgById,
  selectTaskRepeatCfgByIdAllowUndefined,
  selectTaskRepeatCfgsDueOnDay,
  selectTaskRepeatCfgsWithStartTime,
} from './store/task-repeat-cfg.reducer';
import {
  AddTaskRepeatCfgToTask,
  DeleteTaskRepeatCfg,
  DeleteTaskRepeatCfgs,
  UpdateTaskRepeatCfg,
  UpdateTaskRepeatCfgs,
  UpsertTaskRepeatCfg,
} from './store/task-repeat-cfg.actions';
import { Observable } from 'rxjs';
import {
  TaskRepeatCfg,
  TaskRepeatCfgCopy,
  TaskRepeatCfgState,
} from './task-repeat-cfg.model';
import * as shortid from 'shortid';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { T } from '../../t.const';
import { take } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { TODAY_TAG } from '../tag/tag.const';
import { Task, TaskPlanned } from '../tasks/task.model';
import { AddTask, ScheduleTask, UpdateTask } from '../tasks/store/task.actions';
import { WorkContextService } from '../work-context/work-context.service';
import { WorkContextType } from '../work-context/work-context.model';
import { isValidSplitTime } from '../../util/is-valid-split-time';
import { getDateTimeFromClockString } from '../../util/get-date-time-from-clock-string';
import { isSameDay } from '../../util/is-same-day';
import { remindOptionToMilliseconds } from '../tasks/util/remind-option-to-milliseconds';

@Injectable({
  providedIn: 'root',
})
export class TaskRepeatCfgService {
  taskRepeatCfgs$: Observable<TaskRepeatCfg[]> = this._store$.pipe(
    select(selectAllTaskRepeatCfgs),
  );

  taskRepeatCfgsWithStartTime$: Observable<TaskRepeatCfg[]> = this._store$.pipe(
    select(selectTaskRepeatCfgsWithStartTime),
  );

  constructor(
    private _store$: Store<TaskRepeatCfgState>,
    private _matDialog: MatDialog,
    private _taskService: TaskService,
    private _workContextService: WorkContextService,
  ) {}

  getRepeatTableTasksDueForDay$(dayDate: number): Observable<TaskRepeatCfg[]> {
    // ===> taskRepeatCfgs scheduled for today and not yet created already
    return this._store$.pipe(select(selectTaskRepeatCfgsDueOnDay, { dayDate }));
  }

  getTaskRepeatCfgById$(id: string): Observable<TaskRepeatCfg> {
    return this._store$.pipe(select(selectTaskRepeatCfgById, { id }));
  }

  getTaskRepeatCfgByIdAllowUndefined$(id: string): Observable<TaskRepeatCfg | undefined> {
    return this._store$.pipe(select(selectTaskRepeatCfgByIdAllowUndefined, { id }));
  }

  addTaskRepeatCfgToTask(
    taskId: string,
    projectId: string | null,
    taskRepeatCfg: Omit<TaskRepeatCfgCopy, 'id'>,
  ) {
    this._store$.dispatch(
      new AddTaskRepeatCfgToTask({
        taskRepeatCfg: {
          ...taskRepeatCfg,
          projectId,
          id: shortid(),
        },
        taskId,
      }),
    );
  }

  deleteTaskRepeatCfg(id: string) {
    this._store$.dispatch(new DeleteTaskRepeatCfg({ id }));
  }

  deleteTaskRepeatCfgsNoTaskCleanup(ids: string[]) {
    this._store$.dispatch(new DeleteTaskRepeatCfgs({ ids }));
  }

  updateTaskRepeatCfg(id: string, changes: Partial<TaskRepeatCfg>) {
    this._store$.dispatch(new UpdateTaskRepeatCfg({ taskRepeatCfg: { id, changes } }));
  }

  updateTaskRepeatCfgs(ids: string[], changes: Partial<TaskRepeatCfg>) {
    this._store$.dispatch(new UpdateTaskRepeatCfgs({ ids, changes }));
  }

  upsertTaskRepeatCfg(taskRepeatCfg: TaskRepeatCfg) {
    this._store$.dispatch(new UpsertTaskRepeatCfg({ taskRepeatCfg }));
  }

  async createRepeatableTask(
    taskRepeatCfg: TaskRepeatCfg,
    targetDayDate: number,
    currentTaskId: string | null,
  ) {
    const actionsForRepeatCfg = await this.getActionsForTaskRepeatCfg(
      taskRepeatCfg,
      currentTaskId,
      targetDayDate,
    );
    actionsForRepeatCfg.forEach((act) => {
      this._store$.dispatch(act);
    });
  }

  deleteTaskRepeatCfgWithDialog(id: string) {
    this._matDialog
      .open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          message: T.F.TASK_REPEAT.D_CONFIRM_REMOVE.MSG,
          okTxt: T.F.TASK_REPEAT.D_CONFIRM_REMOVE.OK,
        },
      })
      .afterClosed()
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          this.deleteTaskRepeatCfg(id);
        }
      });
  }

  // NOTE: there is a duplicate of this in plan-tasks-tomorrow.component
  async addAllPlannedToDayAndCreateRepeatable(
    plannedTasks: TaskPlanned[],
    repeatableScheduledForTomorrow: TaskRepeatCfg[],
    currentTaskId: string | null,
    targetDay: number,
  ): Promise<void> {
    if (plannedTasks.length) {
      await this._taskService.movePlannedTasksToToday(plannedTasks);
    }
    if (repeatableScheduledForTomorrow.length) {
      const promises = repeatableScheduledForTomorrow.map((repeatCfg) => {
        return this.createRepeatableTask(repeatCfg, targetDay, currentTaskId);
      });
      await Promise.all(promises);
    }
  }

  async getActionsForTaskRepeatCfg(
    taskRepeatCfg: TaskRepeatCfg,
    currentTaskId: string | null,
    targetDayDate: number = Date.now(),
  ): Promise<(UpdateTask | AddTask | UpdateTaskRepeatCfg | ScheduleTask)[]> {
    // NOTE: there might be multiple configs in case something went wrong
    // we want to move all of them to the archive
    const existingTaskInstances: Task[] = await this._taskService
      .getTasksWithSubTasksByRepeatCfgId$(taskRepeatCfg.id as string)
      .pipe(take(1))
      .toPromise();

    if (!taskRepeatCfg.id) {
      throw new Error('No taskRepeatCfg.id');
    }

    const isCreateNew =
      existingTaskInstances.filter((taskI) => isSameDay(targetDayDate, taskI.created))
        .length === 0;

    if (!isCreateNew) {
      return [];
    }

    // move all current left over instances to archive right away
    const markAsDoneActions: (UpdateTask | AddTask | UpdateTaskRepeatCfg)[] =
      existingTaskInstances
        .filter(
          (taskI) =>
            !taskI.isDone &&
            !isSameDay(targetDayDate, taskI.created) &&
            taskI.id !== currentTaskId,
        )
        .map(
          (taskI) =>
            new UpdateTask({
              task: {
                id: taskI.id,
                changes: {
                  isDone: true,
                },
              },
            }),
        );

    const { task, isAddToBottom } = this._getTaskRepeatTemplate(taskRepeatCfg);

    const createNewActions: (AddTask | UpdateTaskRepeatCfg | ScheduleTask)[] = [
      new AddTask({
        task,
        workContextType: this._workContextService
          .activeWorkContextType as WorkContextType,
        workContextId: this._workContextService.activeWorkContextId as string,
        isAddToBacklog: false,
        isAddToBottom,
      }),
      new UpdateTaskRepeatCfg({
        taskRepeatCfg: {
          id: taskRepeatCfg.id,
          changes: {
            lastTaskCreation: targetDayDate,
          },
        },
      }),
    ];

    // Schedule if given
    if (isValidSplitTime(taskRepeatCfg.startTime) && taskRepeatCfg.remindAt) {
      const dateTime = getDateTimeFromClockString(
        taskRepeatCfg.startTime as string,
        targetDayDate,
      );
      createNewActions.push(
        new ScheduleTask({
          task,
          plannedAt: dateTime,
          remindAt: remindOptionToMilliseconds(dateTime, taskRepeatCfg.remindAt),
          isMoveToBacklog: false,
        }),
      );
    }

    return [...markAsDoneActions, ...createNewActions];
  }

  private _getTaskRepeatTemplate(taskRepeatCfg: TaskRepeatCfg): {
    task: Task;
    isAddToBottom: boolean;
  } {
    const isAddToTodayAsFallback =
      !taskRepeatCfg.projectId && !taskRepeatCfg.tagIds.length;
    return {
      task: this._taskService.createNewTaskWithDefaults({
        title: taskRepeatCfg.title,
        additional: {
          repeatCfgId: taskRepeatCfg.id,
          timeEstimate: taskRepeatCfg.defaultEstimate,
          projectId: taskRepeatCfg.projectId,
          tagIds: isAddToTodayAsFallback ? [TODAY_TAG.id] : taskRepeatCfg.tagIds || [],
        },
      }),
      isAddToBottom: taskRepeatCfg.isAddToBottom || false,
    };
  }
}
