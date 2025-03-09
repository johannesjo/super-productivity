import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  concatMap,
  delay,
  filter,
  first,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { Action, select, Store } from '@ngrx/store';
import {
  addTaskRepeatCfgToTask,
  deleteTaskRepeatCfg,
  deleteTaskRepeatCfgs,
  updateTaskRepeatCfg,
  updateTaskRepeatCfgs,
  upsertTaskRepeatCfg,
} from './task-repeat-cfg.actions';
import { selectTaskRepeatCfgFeatureState } from './task-repeat-cfg.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { Task, TaskArchive, TaskCopy } from '../../tasks/task.model';
import { updateTask } from '../../tasks/store/task.actions';
import { TaskService } from '../../tasks/task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg.service';
import {
  TaskRepeatCfg,
  TaskRepeatCfgCopy,
  TaskRepeatCfgState,
} from '../task-repeat-cfg.model';
import { forkJoin, from, merge, of } from 'rxjs';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { SyncTriggerService } from '../../../imex/sync/sync-trigger.service';
import { SyncProviderService } from '../../../imex/sync/sync-provider.service';
import { sortRepeatableTaskCfgs } from '../sort-repeatable-task-cfg';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { T } from '../../../t.const';
import { Update } from '@ngrx/entity';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { isToday } from '../../../util/is-today.util';
import { DateService } from 'src/app/core/date/date.service';
import { deleteProject } from '../../project/store/project.actions';

@Injectable()
export class TaskRepeatCfgEffects {
  private _actions$ = inject(Actions);
  private _taskService = inject(TaskService);
  private _store$ = inject<Store<any>>(Store);
  private _persistenceService = inject(PersistenceService);
  private _dateService = inject(DateService);
  private _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private _syncTriggerService = inject(SyncTriggerService);
  private _syncProviderService = inject(SyncProviderService);
  private _matDialog = inject(MatDialog);

  updateTaskRepeatCfgs$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addTaskRepeatCfgToTask,
          updateTaskRepeatCfg,
          updateTaskRepeatCfgs,
          upsertTaskRepeatCfg,
          deleteTaskRepeatCfg,
          deleteTaskRepeatCfgs,

          // PROJECT
          deleteProject,
        ),
        withLatestFrom(this._store$.pipe(select(selectTaskRepeatCfgFeatureState))),
        tap(this._saveToLs.bind(this)),
      ),
    { dispatch: false },
  );

  private triggerRepeatableTaskCreation$ = merge(
    this._syncTriggerService.afterInitialSyncDoneAndDataLoadedInitially$,
    this._actions$.pipe(
      ofType(setActiveWorkContext),
      concatMap(() => this._syncProviderService.afterCurrentSyncDoneOrSyncDisabled$),
    ),
  ).pipe(
    // make sure everything has settled
    delay(1000),
  );

  createRepeatableTasks: any = createEffect(() =>
    this.triggerRepeatableTaskCreation$.pipe(
      concatMap(
        () =>
          this._taskRepeatCfgService
            .getRepeatTableTasksDueForDayIncludingOverdue$(
              Date.now() - this._dateService.startOfNextDayDiff,
            )
            .pipe(first()),
        // ===> taskRepeatCfgs scheduled for today and not yet created already
      ),
      filter((taskRepeatCfgs) => taskRepeatCfgs && !!taskRepeatCfgs.length),
      withLatestFrom(this._taskService.currentTaskId$),

      // existing tasks with sub-tasks are loaded, because need to move them to the archive
      mergeMap(([taskRepeatCfgs, currentTaskId]) => {
        // NOTE sorting here is important
        const sorted = taskRepeatCfgs.sort(sortRepeatableTaskCfgs);
        return from(sorted).pipe(
          mergeMap((taskRepeatCfg: TaskRepeatCfg) =>
            this._taskRepeatCfgService.getActionsForTaskRepeatCfg(
              taskRepeatCfg,
              Date.now() - this._dateService.startOfNextDayDiff,
            ),
          ),
          concatMap((actionsForRepeatCfg) => from(actionsForRepeatCfg)),
        );
      }),
    ),
  );

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
          this._removeRepeatCfgFromArchiveTasks(id);
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
          plannedAt: dateTime,
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

  private _saveToLs([action, taskRepeatCfgState]: [Action, TaskRepeatCfgState]): void {
    this._persistenceService.taskRepeatCfg.saveState(taskRepeatCfgState, {
      isSyncModelChange: true,
    });
  }

  private _removeRepeatCfgFromArchiveTasks(repeatConfigId: string): void {
    this._persistenceService.taskArchive.loadState().then((taskArchive: TaskArchive) => {
      // if not yet initialized for project
      if (!taskArchive) {
        return;
      }

      const newState = { ...taskArchive };
      const ids = newState.ids as string[];

      const tasksWithRepeatCfgId = ids
        .map((id) => newState.entities[id] as Task)
        .filter((task) => task.repeatCfgId === repeatConfigId);

      if (tasksWithRepeatCfgId && tasksWithRepeatCfgId.length) {
        tasksWithRepeatCfgId.forEach((task: any) => (task.repeatCfgId = null));
        this._persistenceService.taskArchive.saveState(newState, {
          isSyncModelChange: true,
        });
      }
    });
  }
}
