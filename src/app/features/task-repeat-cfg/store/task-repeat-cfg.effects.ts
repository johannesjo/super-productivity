import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  concatMap,
  filter,
  first,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {
  addTaskRepeatCfgToTask,
  deleteTaskRepeatCfg,
  updateTaskRepeatCfg,
} from './task-repeat-cfg.actions';
import { Task, TaskCopy } from '../../tasks/task.model';
import { updateTask } from '../../tasks/store/task.actions';
import { TaskService } from '../../tasks/task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg.service';
import { TaskRepeatCfgCopy } from '../task-repeat-cfg.model';
import { forkJoin, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { T } from '../../../t.const';
import { Update } from '@ngrx/entity';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { isToday } from '../../../util/is-today.util';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';

@Injectable()
export class TaskRepeatCfgEffects {
  private _actions$ = inject(Actions);
  private _taskService = inject(TaskService);
  private _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private _matDialog = inject(MatDialog);
  private _taskArchiveService = inject(TaskArchiveService);

  removeConfigIdFromTaskStateTasks$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteTaskRepeatCfg),
      concatMap(({ id }) => this._taskService.getTasksByRepeatCfgId$(id).pipe(take(1))),
      filter((tasks) => tasks && !!tasks.length),
      mergeMap((tasks: Task[]) =>
        tasks.map((task) =>
          updateTask({
            task: {
              id: task.id,
              changes: { repeatCfgId: undefined },
            },
          }),
        ),
      ),
    ),
  );

  removeConfigIdFromTaskArchiveTasks$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteTaskRepeatCfg),
        tap(({ id }) => {
          this._taskArchiveService.removeRepeatCfgFromArchiveTasks(id);
        }),
      ),
    { dispatch: false },
  );

  updateTaskAfterMakingItRepeatable$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addTaskRepeatCfgToTask),
        switchMap(({ taskRepeatCfg, taskId }) => {
          return this._taskService.getByIdOnce$(taskId).pipe(
            first(),
            map((task) => ({
              task,
              taskRepeatCfg,
            })),
          );
        }),
        tap(({ task, taskRepeatCfg }) => {
          this._updateRegularTaskInstance(task, taskRepeatCfg, taskRepeatCfg);
        }),
      ),
    { dispatch: false },
  );

  checkToUpdateAllTaskInstances: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTaskRepeatCfg),
        filter(({ isAskToUpdateAllTaskInstances }) => !!isAskToUpdateAllTaskInstances),
        concatMap(({ taskRepeatCfg }) => {
          const id = taskRepeatCfg.id as string;
          return forkJoin([
            of(taskRepeatCfg),
            this._taskService.getTasksByRepeatCfgId$(id).pipe(first()),
            this._taskService.getArchiveTasksForRepeatCfgId(id),
          ]);
        }),
        concatMap(([{ id, changes }, todayTasks, archiveTasks]) => {
          if (todayTasks.length + archiveTasks.length === 0) {
            return of(false);
          }
          // NOTE: there will always be at least on instance, since we're editing it
          return this._matDialog
            .open(DialogConfirmComponent, {
              restoreFocus: true,
              data: {
                okTxt: T.F.TASK_REPEAT.D_CONFIRM_UPDATE_INSTANCES.OK,
                cancelTxt: T.F.TASK_REPEAT.D_CONFIRM_UPDATE_INSTANCES.CANCEL,
                message: T.F.TASK_REPEAT.D_CONFIRM_UPDATE_INSTANCES.MSG,
                translateParams: { tasksNr: todayTasks.length + archiveTasks.length },
              },
            })
            .afterClosed()
            .pipe(
              withLatestFrom(
                this._taskRepeatCfgService.getTaskRepeatCfgById$(id as string),
              ),
              tap(([isConfirm, completeCfg]) => {
                if (isConfirm) {
                  console.log(changes);
                  console.log(todayTasks, archiveTasks);
                  // NOTE: keep in mind that it's very likely that there will be only one task for today
                  // TODO update reminders if given
                  todayTasks.forEach((task) =>
                    this._updateRegularTaskInstance(task, changes, completeCfg),
                  );

                  const archiveUpdates: Update<TaskCopy>[] = archiveTasks.map((task) => {
                    const changesForArchiveTask: Partial<TaskCopy> = {};
                    // NOTE: projects can't be updated from the dialog
                    // if (
                    //   typeof changes.projectId === 'string' &&
                    //   task.projectId !== changes.projectId
                    // ) {
                    //   changesForArchiveTask.projectId = changes.projectId;
                    //   // TODO also update sub tasks
                    //   if (task.subTaskIds) {
                    //     task.subTaskIds.forEach((subTaskId) => {
                    //       this._taskService.updateArchiveTask(
                    //         subTaskId,
                    //         changesForArchiveTask,
                    //       );
                    //     });
                    //   }
                    // }
                    if (changes.tagIds) {
                      changesForArchiveTask.tagIds = changes.tagIds;
                    }
                    if (changes.title) {
                      changesForArchiveTask.title = changes.title;
                    }
                    if (changes.notes) {
                      changesForArchiveTask.notes = changes.notes;
                    }
                    if (
                      typeof changes.defaultEstimate === 'number' &&
                      task.subTaskIds.length === 0
                    ) {
                      changesForArchiveTask.timeEstimate = changes.defaultEstimate;
                    }
                    console.log('updateArchiveTask', changesForArchiveTask);
                    return { id: task.id, changes: changesForArchiveTask };
                  });
                  this._taskService.updateArchiveTasks(archiveUpdates);
                }
              }),
            );
        }),
      ),
    { dispatch: false },
  );

  private _updateRegularTaskInstance(
    task: TaskCopy,
    changes: Partial<TaskRepeatCfgCopy>,
    completeCfg: TaskRepeatCfgCopy,
  ): void {
    // NOTE: projects can't be updated from the dialog,
    // if (
    //   typeof changes.projectId === 'string' &&
    //   task.projectId !== changes.projectId
    // ) {
    //   const withSubTasks = await this._taskService
    //     .getByIdWithSubTaskData$(task.id)
    //     .pipe(take(1))
    //     .toPromise();
    //   this._taskService.moveToProject(withSubTasks, changes.projectId);
    // }
    if (
      (changes.startTime || changes.remindAt) &&
      completeCfg.remindAt &&
      completeCfg.startTime &&
      isToday(task.created)
    ) {
      const dateTime = getDateTimeFromClockString(
        completeCfg.startTime as string,
        new Date(),
      );
      if (task.reminderId) {
        this._taskService.reScheduleTask({
          task,
          due: dateTime,
          remindCfg: completeCfg.remindAt,
          isMoveToBacklog: false,
        });
      } else {
        this._taskService.scheduleTask(task, dateTime, completeCfg.remindAt);
      }
    }
    if (changes.tagIds) {
      this._taskService.updateTags(task, changes.tagIds);
    }
    if (changes.title || changes.notes) {
      this._taskService.update(task.id, {
        ...(changes.title
          ? {
              title: changes.title,
            }
          : {}),
        ...(changes.notes
          ? {
              notes: changes.notes,
            }
          : {}),
      });
    }
    if (typeof changes.defaultEstimate === 'number' && task.subTaskIds.length === 0) {
      this._taskService.update(task.id, {
        timeEstimate: changes.defaultEstimate,
      });
    }
  }
}
