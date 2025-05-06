import { inject, Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  selectAllTaskRepeatCfgs,
  selectTaskRepeatCfgById,
  selectTaskRepeatCfgByIdAllowUndefined,
  selectTaskRepeatCfgsDueOnDayIncludingOverdue,
  selectTaskRepeatCfgsDueOnDayOnly,
} from './store/task-repeat-cfg.reducer';
import {
  addTaskRepeatCfgToTask,
  deleteTaskRepeatCfg,
  deleteTaskRepeatCfgs,
  updateTaskRepeatCfg,
  updateTaskRepeatCfgs,
  upsertTaskRepeatCfg,
} from './store/task-repeat-cfg.actions';
import { Observable } from 'rxjs';
import {
  TaskRepeatCfg,
  TaskRepeatCfgCopy,
  TaskRepeatCfgState,
} from './task-repeat-cfg.model';
import { nanoid } from 'nanoid';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { T } from '../../t.const';
import { first, take } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { Task } from '../tasks/task.model';
import { addTask, scheduleTaskWithTime } from '../tasks/store/task.actions';
import { WorkContextService } from '../work-context/work-context.service';
import { WorkContextType } from '../work-context/work-context.model';
import { isValidSplitTime } from '../../util/is-valid-split-time';
import { getDateTimeFromClockString } from '../../util/get-date-time-from-clock-string';
import { isSameDay } from '../../util/is-same-day';
import { remindOptionToMilliseconds } from '../tasks/util/remind-option-to-milliseconds';
import { getNewestPossibleDueDate } from './store/get-newest-possible-due-date.util';
import { getWorklogStr } from '../../util/get-work-log-str';

@Injectable({
  providedIn: 'root',
})
export class TaskRepeatCfgService {
  private _store$ = inject<Store<TaskRepeatCfgState>>(Store);
  private _matDialog = inject(MatDialog);
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);

  taskRepeatCfgs$: Observable<TaskRepeatCfg[]> = this._store$.pipe(
    select(selectAllTaskRepeatCfgs),
  );

  getRepeatableTasksDueForDayOnly$(dayDate: number): Observable<TaskRepeatCfg[]> {
    // ===> taskRepeatCfgs scheduled for today and not yet created already
    return this._store$.select(selectTaskRepeatCfgsDueOnDayOnly, { dayDate });
  }

  getRepeatableTasksDueForDayIncludingOverdue$(
    dayDate: number,
  ): Observable<TaskRepeatCfg[]> {
    // ===> taskRepeatCfgs scheduled for today and not yet created already
    return this._store$
      .select(selectTaskRepeatCfgsDueOnDayIncludingOverdue, { dayDate })
      .pipe(first());
  }

  getTaskRepeatCfgById$(id: string): Observable<TaskRepeatCfg> {
    return this._store$.select(selectTaskRepeatCfgById, { id });
  }

  getTaskRepeatCfgByIdAllowUndefined$(id: string): Observable<TaskRepeatCfg | undefined> {
    return this._store$.select(selectTaskRepeatCfgByIdAllowUndefined, { id });
  }

  addTaskRepeatCfgToTask(
    taskId: string,
    projectId: string | null,
    taskRepeatCfg: Omit<TaskRepeatCfgCopy, 'id'>,
  ): void {
    this._store$.dispatch(
      addTaskRepeatCfgToTask({
        taskRepeatCfg: {
          ...taskRepeatCfg,
          projectId,
          id: nanoid(),
        },
        taskId,
      }),
    );
  }

  deleteTaskRepeatCfg(id: string): void {
    this._store$.dispatch(deleteTaskRepeatCfg({ id }));
  }

  deleteTaskRepeatCfgsNoTaskCleanup(ids: string[]): void {
    this._store$.dispatch(deleteTaskRepeatCfgs({ ids }));
  }

  updateTaskRepeatCfg(
    id: string,
    changes: Partial<TaskRepeatCfg>,
    isUpdateAllTaskInstances: boolean = false,
  ): void {
    this._store$.dispatch(
      updateTaskRepeatCfg({
        taskRepeatCfg: { id, changes },
        isAskToUpdateAllTaskInstances: isUpdateAllTaskInstances,
      }),
    );
  }

  updateTaskRepeatCfgs(ids: string[], changes: Partial<TaskRepeatCfg>): void {
    this._store$.dispatch(updateTaskRepeatCfgs({ ids, changes }));
  }

  upsertTaskRepeatCfg(taskRepeatCfg: TaskRepeatCfg): void {
    this._store$.dispatch(upsertTaskRepeatCfg({ taskRepeatCfg }));
  }

  async createRepeatableTask(
    taskRepeatCfg: TaskRepeatCfg,
    targetDayDate: number,
  ): Promise<void> {
    const actionsForRepeatCfg = await this.getActionsForTaskRepeatCfg(
      taskRepeatCfg,
      targetDayDate,
    );
    actionsForRepeatCfg.forEach((act) => {
      this._store$.dispatch(act);
    });
  }

  deleteTaskRepeatCfgWithDialog(id: string): void {
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

  async getActionsForTaskRepeatCfg(
    taskRepeatCfg: TaskRepeatCfg,
    targetDayDate: number = Date.now(),
  ): // NOTE: updateTaskRepeatCfg missing as there is no way to declare it as action type
  Promise<
    (
      | ReturnType<typeof addTask>
      | ReturnType<typeof updateTaskRepeatCfg>
      | ReturnType<typeof scheduleTaskWithTime>
    )[]
  > {
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
    const targetCreated = getNewestPossibleDueDate(
      taskRepeatCfg,
      new Date(targetDayDate),
    );
    if (!targetCreated) {
      throw new Error('Unable to getNewestPossibleDueDate()');
    }

    const { task, isAddToBottom } = this._getTaskRepeatTemplate(taskRepeatCfg);

    const createNewActions: (
      | ReturnType<typeof addTask>
      | ReturnType<typeof updateTaskRepeatCfg>
      | ReturnType<typeof scheduleTaskWithTime>
    )[] = [
      addTask({
        task: {
          ...task,
          // NOTE if moving this to top isCreateNew check above would not work as intended
          // we use created also for the repeat day label for past tasks
          created: targetCreated.getTime(),
          dueDay: getWorklogStr(targetCreated),
        },
        workContextType: this._workContextService
          .activeWorkContextType as WorkContextType,
        workContextId: this._workContextService.activeWorkContextId as string,
        isAddToBacklog: false,
        isAddToBottom,
      }),
      updateTaskRepeatCfg({
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
        scheduleTaskWithTime({
          task,
          dueWithTime: dateTime,
          remindAt: remindOptionToMilliseconds(dateTime, taskRepeatCfg.remindAt),
          isMoveToBacklog: false,
          isSkipAutoRemoveFromToday: true,
        }),
      );
    }

    return createNewActions;
  }

  private _getTaskRepeatTemplate(taskRepeatCfg: TaskRepeatCfg): {
    task: Task;
    isAddToBottom: boolean;
  } {
    return {
      task: this._taskService.createNewTaskWithDefaults({
        title: taskRepeatCfg.title,
        additional: {
          repeatCfgId: taskRepeatCfg.id,
          timeEstimate: taskRepeatCfg.defaultEstimate,
          projectId: taskRepeatCfg.projectId || undefined,
          notes: taskRepeatCfg.notes || '',
          // always due for today
          dueDay: getWorklogStr(),
        },
      }),
      isAddToBottom: taskRepeatCfg.order > 0,
    };
  }
}
