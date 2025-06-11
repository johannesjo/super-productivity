import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { filter, map, switchMap, take, tap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

import {
  deleteTask,
  deleteTasks,
  updateTask,
  addTask,
} from '../features/tasks/store/task.actions';
import { selectTaskById } from '../features/tasks/store/task.selectors';
import { Task } from '../features/tasks/task.model';
import { PluginService } from './plugin.service';
import { PluginHooks } from './plugin-api.model';
import { updateGlobalConfigSection } from '../features/config/store/global-config.actions';
import { setActiveWorkContext } from '../features/work-context/store/work-context.actions';

@Injectable()
export class PluginHooksEffects {
  // Effect for task completion (when isDone changes to true)
  taskComplete$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateTask),
        filter((action) => action.task.changes.isDone === true),
        switchMap((action) =>
          this.store.pipe(
            select(selectTaskById, { id: action.task.id as string }),
            take(1),
            tap((task: Task | undefined) => {
              if (task) {
                this.pluginService.dispatchHook(PluginHooks.TASK_COMPLETE, task);
              }
            }),
            map(() => EMPTY),
          ),
        ),
      ),
    { dispatch: false },
  );

  // Effect for task updates (any task update)
  taskUpdate$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateTask),
        switchMap((action) =>
          this.store.pipe(
            select(selectTaskById, { id: action.task.id as string }),
            take(1),
            tap((task: Task | undefined) => {
              if (task) {
                this.pluginService.dispatchHook(PluginHooks.TASK_UPDATE, task);
              }
            }),
            map(() => EMPTY),
          ),
        ),
      ),
    { dispatch: false },
  );

  // Effect for task deletion
  taskDelete$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(deleteTask),
        tap((action) => {
          this.pluginService.dispatchHook(PluginHooks.TASK_DELETE, {
            taskId: action.task.id,
          });
        }),
      ),
    { dispatch: false },
  );

  // Effect for multiple task deletion
  tasksDelete$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(deleteTasks),
        tap((action) => {
          this.pluginService.dispatchHook(PluginHooks.TASK_DELETE, {
            taskIds: action.taskIds,
          });
        }),
      ),
    { dispatch: false },
  );

  // Effect for task creation
  taskAdd$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(addTask),
        switchMap((action) =>
          this.store.pipe(
            select(selectTaskById, { id: action.task.id }),
            take(1),
            filter((task) => !!task),
            tap((task: Task | undefined) => {
              if (task) {
                this.pluginService.dispatchHook(PluginHooks.TASK_UPDATE, task);
              }
            }),
            map(() => EMPTY),
          ),
        ),
      ),
    { dispatch: false },
  );

  // Effect for configuration changes
  configChange$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateGlobalConfigSection),
        tap((action) => {
          this.pluginService.dispatchHook(PluginHooks.CFG_CHANGE, {
            sectionKey: action.sectionKey,
            sectionCfg: action.sectionCfg,
          });
        }),
      ),
    { dispatch: false },
  );

  // Effect for work context changes
  workContextChange$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(setActiveWorkContext),
        tap((action) => {
          this.pluginService.dispatchHook(PluginHooks.LANGUAGE_CHANGE, {
            activeId: action.activeId,
            activeType: action.activeType,
          });
        }),
      ),
    { dispatch: false },
  );

  // Effect for when the day ends (finish day)
  finishDay$ = createEffect(
    () =>
      this.actions$.pipe(
        // This would need to be connected to a finish day action
        // For now, we'll leave it as a placeholder
        filter(() => false), // Never triggers for now
        tap(() => {
          this.pluginService.dispatchHook(PluginHooks.FINISH_DAY, {
            timestamp: Date.now(),
          });
        }),
      ),
    { dispatch: false },
  );

  constructor(
    private actions$: Actions,
    private store: Store,
    private pluginService: PluginService,
  ) {}
}
