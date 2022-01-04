import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
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
import { TaskRepeatCfg, TaskRepeatCfgState } from '../task-repeat-cfg.model';
import { forkJoin, from, merge, of } from 'rxjs';
import { WorkContextService } from '../../work-context/work-context.service';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { SyncTriggerService } from '../../../imex/sync/sync-trigger.service';
import { SyncProviderService } from '../../../imex/sync/sync-provider.service';
import { sortRepeatableTaskCfgs } from '../sort-repeatable-task-cfg';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { T } from '../../../t.const';
import { Update } from '@ngrx/entity';

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
            .getRepeatTableTasksDueForDay$(Date.now())
            .pipe(first()),
        // ===> taskRepeatCfgs scheduled for today and not yet created already
      ),
      filter((taskRepeatCfgs) => taskRepeatCfgs && !!taskRepeatCfgs.length),
      withLatestFrom(this._taskService.currentTaskId$),

      // existing tasks with sub tasks are loaded, because need to move them to the archive
      mergeMap(([taskRepeatCfgs, currentTaskId]) => {
        // NOTE sorting here is important
        const sorted = taskRepeatCfgs.sort(sortRepeatableTaskCfgs);
        return from(sorted).pipe(
          mergeMap((taskRepeatCfg: TaskRepeatCfg) =>
            this._taskRepeatCfgService.getActionsForTaskRepeatCfg(
              taskRepeatCfg,
              currentTaskId,
              Date.now(),
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
              changes: { repeatCfgId: null },
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
          // NOTE: there will always be at least on instance, since we're editing it
          return this._matDialog
            .open(DialogConfirmComponent, {
              restoreFocus: true,
              data: {
                okTxt: T.F.TASK_REPEAT.D_CONFIRM_UPDATE_INSTANCES.OK,
                message: T.F.TASK_REPEAT.D_CONFIRM_UPDATE_INSTANCES.MSG,
                translateParams: { tasksNr: todayTasks.length + archiveTasks.length },
              },
            })
            .afterClosed()
            .pipe(
              tap((isConfirm) => {
                if (isConfirm) {
                  console.log(changes);
                  console.log(todayTasks, archiveTasks);
                  // NOTE: keep in mind that it's very likely that there will be only one task for today
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
                    if (changes.tagIds) {
                      this._taskService.updateTags(task, changes.tagIds, task.tagIds);
                    }
                    if (changes.title) {
                      this._taskService.update(task.id, { title: changes.title });
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
    private _workContextService: WorkContextService,
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
