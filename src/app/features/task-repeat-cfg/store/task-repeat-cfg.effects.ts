import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import {
  concatMap,
  delay,
  filter,
  mergeMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { Action, select, Store } from '@ngrx/store';
import {
  DeleteTaskRepeatCfg,
  TaskRepeatCfgActionTypes,
  UpdateTaskRepeatCfg,
} from './task-repeat-cfg.actions';
import { selectTaskRepeatCfgFeatureState } from './task-repeat-cfg.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { Task, TaskArchive, TaskWithSubTasks } from '../../tasks/task.model';
import { AddTask, ScheduleTask, UpdateTask } from '../../tasks/store/task.actions';
import { TaskService } from '../../tasks/task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg.service';
import { TaskRepeatCfg, TaskRepeatCfgState } from '../task-repeat-cfg.model';
import { EMPTY, from, merge } from 'rxjs';
import { isToday } from '../../../util/is-today.util';
import { WorkContextService } from '../../work-context/work-context.service';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { SyncService } from '../../../imex/sync/sync.service';
import { WorkContextType } from '../../work-context/work-context.model';
import { isValidSplitTime } from '../../../util/is-valid-split-time';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';

@Injectable()
export class TaskRepeatCfgEffects {
  @Effect({ dispatch: false }) updateTaskRepeatCfgs$: any = this._actions$.pipe(
    ofType(
      TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask,
      TaskRepeatCfgActionTypes.UpdateTaskRepeatCfg,
      TaskRepeatCfgActionTypes.UpsertTaskRepeatCfg,
      TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg,
      TaskRepeatCfgActionTypes.DeleteTaskRepeatCfgs,
    ),
    withLatestFrom(this._store$.pipe(select(selectTaskRepeatCfgFeatureState))),
    tap(this._saveToLs.bind(this)),
  );

  private triggerRepeatableTaskCreation$ = merge(
    this._syncService.afterInitialSyncDoneAndDataLoadedInitially$.pipe(delay(1000)),
    this._actions$.pipe(
      ofType(setActiveWorkContext),
      concatMap(() => this._syncService.afterInitialSyncDoneAndDataLoadedInitially$),
      delay(1000),
    ),
  );

  @Effect() createRepeatableTasks: any = this.triggerRepeatableTaskCreation$.pipe(
    concatMap(
      () => this._taskRepeatCfgService.getRepeatTableTasksDueForDayOnce$(Date.now()),
      // ===> taskRepeatCfgs scheduled for today and not yet created already
    ),
    filter((taskRepeatCfgs) => taskRepeatCfgs && !!taskRepeatCfgs.length),

    // existing tasks with sub tasks are loaded, because need to move them to the archive
    mergeMap((taskRepeatCfgs) =>
      from(taskRepeatCfgs).pipe(
        mergeMap((taskRepeatCfg: TaskRepeatCfg) =>
          // NOTE: there might be multiple configs in case something went wrong
          // we want to move all of them to the archive
          this._taskService
            .getTasksWithSubTasksByRepeatCfgId$(taskRepeatCfg.id as string)
            .pipe(
              take(1),
              concatMap((existingTaskInstances: Task[]) => {
                if (!taskRepeatCfg.id) {
                  throw new Error('No taskRepeatCfg.id');
                }

                const isCreateNew =
                  existingTaskInstances.filter((taskI) => isToday(taskI.created))
                    .length === 0;

                if (!isCreateNew) {
                  return EMPTY;
                }

                // move all current left over instances to archive right away
                const markAsDoneActions: (
                  | UpdateTask
                  | AddTask
                  | UpdateTaskRepeatCfg
                )[] = existingTaskInstances
                  .filter((taskI) => !task.isDone && !isToday(taskI.created))
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

                const {
                  task,
                  isAddToBottom,
                } = this._taskRepeatCfgService.getTaskRepeatTemplate(taskRepeatCfg);

                const createNewActions: (
                  | AddTask
                  | UpdateTaskRepeatCfg
                  | ScheduleTask
                )[] = [
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
                        lastTaskCreation: Date.now(),
                      },
                    },
                  }),
                ];

                // Schedule if given
                if (isValidSplitTime(taskRepeatCfg.startTime)) {
                  const dateTime = getDateTimeFromClockString(
                    taskRepeatCfg.startTime as string,
                    new Date(),
                  );
                  createNewActions.push(
                    new ScheduleTask({
                      task,
                      plannedAt: dateTime,
                      remindAt: dateTime,
                      isMoveToBacklog: false,
                    }),
                  );
                }

                return from([...markAsDoneActions, ...createNewActions]);
              }),
            ),
        ),
      ),
    ),
    tap((v) => console.log('IMP Create Repeatable Tasks', v)),
  );

  @Effect() removeConfigIdFromTaskStateTasks$: any = this._actions$.pipe(
    ofType(TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg),
    concatMap((action: DeleteTaskRepeatCfg) =>
      this._taskService.getTasksByRepeatCfgId$(action.payload.id).pipe(take(1)),
    ),
    filter((tasks) => tasks && !!tasks.length),
    mergeMap((tasks: Task[]) =>
      tasks.map(
        (task) =>
          new UpdateTask({
            task: {
              id: task.id,
              changes: { repeatCfgId: null },
            },
          }),
      ),
    ),
  );

  @Effect({ dispatch: false })
  removeConfigIdFromTaskArchiveTasks$: any = this._actions$.pipe(
    ofType(TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg),
    tap((a: DeleteTaskRepeatCfg) => {
      this._removeRepeatCfgFromArchiveTasks(a.payload.id);
    }),
  );

  // @Effect() removeRemindersOnCreation$: any = this._actions$.pipe(
  //   ofType(TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask),
  //   concatMap((a: AddTaskRepeatCfgToTask) =>
  //     this._taskService.getByIdOnce$(a.payload.taskId).pipe(take(1)),
  //   ),
  //   filter((task: TaskWithSubTasks) => typeof task.reminderId === 'string'),
  //   map(
  //     (task: TaskWithSubTasks) =>
  //       new UnScheduleTask({
  //         id: task.id,
  //         reminderId: task.reminderId as string,
  //       }),
  //   ),
  // );

  constructor(
    private _actions$: Actions,
    private _taskService: TaskService,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _syncService: SyncService,
  ) {}

  private _saveToLs([action, taskRepeatCfgState]: [Action, TaskRepeatCfgState]) {
    this._persistenceService.taskRepeatCfg.saveState(taskRepeatCfgState, {
      isSyncModelChange: true,
    });
  }

  private _removeRepeatCfgFromArchiveTasks(repeatConfigId: string) {
    this._persistenceService.taskArchive.loadState().then((taskArchive: TaskArchive) => {
      // if not yet initialized for project
      if (!taskArchive) {
        return;
      }

      const newState = { ...taskArchive };
      const ids = newState.ids as string[];

      const tasksWithRepeatCfgId = ids
        .map((id) => newState.entities[id] as Task)
        .filter((task: TaskWithSubTasks) => task.repeatCfgId === repeatConfigId);

      if (tasksWithRepeatCfgId && tasksWithRepeatCfgId.length) {
        tasksWithRepeatCfgId.forEach((task: any) => (task.repeatCfgId = null));
        this._persistenceService.taskArchive.saveState(newState, {
          isSyncModelChange: true,
        });
      }
    });
  }
}
