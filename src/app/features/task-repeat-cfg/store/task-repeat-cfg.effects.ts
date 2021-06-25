import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import {
  concatMap,
  delay,
  filter,
  first,
  mergeMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { Action, select, Store } from '@ngrx/store';
import { DeleteTaskRepeatCfg, TaskRepeatCfgActionTypes } from './task-repeat-cfg.actions';
import { selectTaskRepeatCfgFeatureState } from './task-repeat-cfg.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { Task, TaskArchive, TaskWithSubTasks } from '../../tasks/task.model';
import { UpdateTask } from '../../tasks/store/task.actions';
import { TaskService } from '../../tasks/task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg.service';
import { TaskRepeatCfg, TaskRepeatCfgState } from '../task-repeat-cfg.model';
import { from, merge } from 'rxjs';
import { WorkContextService } from '../../work-context/work-context.service';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { SyncService } from '../../../imex/sync/sync.service';

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
      () =>
        this._taskRepeatCfgService
          .getRepeatTableTasksDueForDay$(Date.now())
          .pipe(first()),
      // ===> taskRepeatCfgs scheduled for today and not yet created already
    ),
    filter((taskRepeatCfgs) => taskRepeatCfgs && !!taskRepeatCfgs.length),

    // existing tasks with sub tasks are loaded, because need to move them to the archive
    mergeMap((taskRepeatCfgs) =>
      from(taskRepeatCfgs).pipe(
        mergeMap((taskRepeatCfg: TaskRepeatCfg) =>
          this._taskRepeatCfgService.getActionsForTaskRepeatCfg(taskRepeatCfg),
        ),
        tap((actionsForRepeatCfg) =>
          console.log('actionsForRepeatCfg', actionsForRepeatCfg),
        ),
        concatMap((actionsForRepeatCfg) => from(actionsForRepeatCfg)),
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
