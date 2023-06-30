import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  concatMap,
  delay,
  filter,
  first,
  map,
  mergeMap,
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
import { addSubTask, updateTask } from '../../tasks/store/task.actions';
import { TaskService } from '../../tasks/task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg.service';
import {
  DEFAULT_TASK_REPEAT_CFG,
  TaskRepeatCfg,
  TaskRepeatCfgCopy,
  TaskRepeatCfgState,
} from '../task-repeat-cfg.model';
import { Observable, forkJoin, from, merge, of } from 'rxjs';
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
import { getWorklogStr } from 'src/app/util/get-work-log-str';
import { getTaskById } from '../../tasks/store/task.reducer.util';

@Injectable()
export class TaskRepeatCfgEffects {
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
        ),
        withLatestFrom(this._store$.pipe(select(selectTaskRepeatCfgFeatureState))),
        tap(this._saveToLs.bind(this)),
      ),
    { dispatch: false },
  );

  /**
   * Updates the repeatCfg of a task, if the task was updated.
   */
  updateRepeatCfgWhenTaskUpdates: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTask),
        tap(async (aAction) => {
          const allTasks = await this._taskService.allTasks$.pipe(first()).toPromise();
          const task = allTasks.find((aTask) => aTask.id === aAction.task.id)!;

          if (task.repeatCfgId !== null) {
            const repeatCfgForTask = await this._taskRepeatCfgService
              .getTaskRepeatCfgById$(task.repeatCfgId)
              .pipe(first())
              .toPromise();

            const taskChanges = aAction.task.changes;

            // TODO: is there a better way to do this? Is there anything missing?
            const repeatCfgChanges: Partial<TaskRepeatCfgCopy> = {
              projectId: taskChanges.projectId ?? repeatCfgForTask.projectId,
              title: taskChanges.title ?? repeatCfgForTask.title,
              tagIds: taskChanges.tagIds ?? repeatCfgForTask.tagIds,
              notes: taskChanges.notes ?? repeatCfgForTask.notes,
            };

            // TODO: Do we need to do this for all instances??
            this._taskRepeatCfgService.updateTaskRepeatCfg(
              task.repeatCfgId,
              repeatCfgChanges,
            );
          }
        }),
      ),
    { dispatch: false }, // Question: What exactly does this do?
  );

  /**
   * When a main task is made repeatable, this function checks if there are subtasks.
   * If that is the case, a repeat-cfg gets added for each subtask, too.
   */
  addTaskRepeatCfgForSubTasksOf: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addTaskRepeatCfgToTask),
        tap(async (aAction) => {
          // TODO: is there an easier way to get to the parent task?
          const allTasks = await this._taskService.allTasks$.pipe(first()).toPromise();
          const parentTask = allTasks.find((aTask) => aTask.id === aAction.taskId);
          const parentTaskRepeatCfg = aAction.taskRepeatCfg;

          if (parentTask !== undefined && parentTask.subTaskIds.length > 0) {
            for (const aSubTaskId of parentTask.subTaskIds) {
              const task = allTasks.find((aTask) => aTask.id === aSubTaskId)!;

              const repeatCfg = {
                ...parentTaskRepeatCfg,
                // TODO: anything missing in this list that should not be overwritten by the parent?
                title: task.title,
                notes: task.notes,
                defaultEstimate: task.timeEstimate, // is this correct?
                parentId: parentTask.repeatCfgId,
              };

              this._taskRepeatCfgService.addTaskRepeatCfgToTask(
                task.id,
                task.projectId,
                repeatCfg,
              );
            }
          }
        }),
      ),
    { dispatch: false }, // Question: What exactly does this do?
  );

  /**
   * When adding a sub task, this function checks if the parent is a repeatable task and therefore the sub-task also has to be.
   * If that is the case, a repeat-cfg gets added for each subtask, too.
   */
  addTaskRepeatCfgForSubTask: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addSubTask),
        tap(async (aAction) => {
          const task = aAction.task;

          // we only want to continue if the task doesn't already have a repeatCfgId
          if (task.repeatCfgId === null) {
            console.log('A TASKKK', task);

            // TODO: is there an easier way to get to the parent task?
            const allTasks = await this._taskService.allTasks$.pipe(first()).toPromise();
            const parentTask = allTasks.find((aTask) => aTask.id === aAction.parentId);

            console.log('PARENT TASK', parentTask);

            if (parentTask !== undefined && parentTask.repeatCfgId !== null) {
              const parentRepeatCfg = await this._taskRepeatCfgService
                .getTaskRepeatCfgById$(parentTask.repeatCfgId)
                .pipe(first())
                .toPromise();

              const repeatCfg = {
                ...parentRepeatCfg,
                // TODO: anything missing in this list that should not be overwritten by the parent?
                title: task.title,
                notes: task.notes || undefined,
                defaultEstimate: task.timeEstimate, // is this correct?
                parentId: parentRepeatCfg.id,
              };

              this._taskRepeatCfgService.addTaskRepeatCfgToTask(
                task.id,
                task.projectId,
                repeatCfg,
              );
            }
          }
        }),
      ),
    { dispatch: false }, // Question: What exactly does this do?
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
            .getRepeatTableTasksDueForDay$(
              Date.now() - this._dateService.startOfNextDayDiff,
            )
            .pipe(first()),
        // ===> taskRepeatCfgs scheduled for today and not yet created already
      ),
      filter((taskRepeatCfgs) => taskRepeatCfgs && !!taskRepeatCfgs.length),
      withLatestFrom(this._taskService.currentTaskId$),

      // existing tasks with sub tasks are loaded, because need to move them to the archive
      mergeMap(([taskRepeatCfgs, currentTaskId]) => {
        // we only want to work with parent tasks, so filter out sub tasks
        const parentTasksRepeatCfgs = taskRepeatCfgs.filter(
          (aTask) => aTask.parentId === null,
        );

        // NOTE sorting here is important
        const sorted = parentTasksRepeatCfgs.sort(sortRepeatableTaskCfgs);

        return from(sorted).pipe(
          mergeMap((taskRepeatCfg: TaskRepeatCfg) =>
            this._taskRepeatCfgService.getActionsForTaskRepeatCfg(
              taskRepeatCfg,
              currentTaskId,
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
      concatMap((value: TaskCopy[], index) => {
        const tasks: Readonly<TaskCopy>[] = value;
        const allSubIds = tasks.flatMap((aTask) => aTask.subTaskIds);

        return this._taskService
          .getByIdsLive$(allSubIds)
          .pipe(map((aAllSubTasks: TaskCopy[]) => ({ aAllSubTasks, tasks })));
      }),
      mergeMap(({ aAllSubTasks, tasks }) => {
        return [...aAllSubTasks, ...tasks].map((task) =>
          updateTask({
            task: {
              id: task.id,
              changes: { repeatCfgId: null },
            },
          }),
        );
      }),
    ),
  );

  removeConfigIdFromTaskArchiveTasks$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteTaskRepeatCfg),
        tap(async ({ id }) => {
          const subTasks = await this._taskRepeatCfgService
            .getTaskRepeatCfgsByParentId$(id)
            .pipe(first())
            .toPromise();

          if (subTasks.length > 0) {
            const subTaskIds = subTasks.map((aTask) => aTask.id);

            // remove repeat cfgs from sub tasks
            for (const aId of subTaskIds) {
              this._removeRepeatCfgFromArchiveTasks(aId);
            }
          }

          // remove repeat cfg from main task
          this._removeRepeatCfgFromArchiveTasks(id);
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
                  todayTasks.forEach((task) => {
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
                        this._taskService.scheduleTask(
                          task,
                          dateTime,
                          completeCfg.remindAt,
                        );
                      }
                    }
                    if (changes.tagIds) {
                      this._taskService.updateTags(task, changes.tagIds, task.tagIds);
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
                    if (
                      typeof changes.defaultEstimate === 'number' &&
                      task.subTaskIds.length === 0
                    ) {
                      this._taskService.update(task.id, {
                        timeEstimate: changes.defaultEstimate,
                      });
                    }
                  });

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

  constructor(
    private _actions$: Actions,
    private _taskService: TaskService,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _dateService: DateService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _syncTriggerService: SyncTriggerService,
    private _syncProviderService: SyncProviderService,
    private _matDialog: MatDialog,
  ) {}

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
