import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { filter, map, switchMap, take, tap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

import {
  addTask,
  deleteTask,
  deleteTasks,
  updateTask,
} from '../features/tasks/store/task.actions';
import { selectTaskById } from '../features/tasks/store/task.selectors';
import { Task } from '../features/tasks/task.model';
import { PluginService } from './plugin.service';
import { PluginHooks } from './plugin-api.model';
import { setActiveWorkContext } from '../features/work-context/store/work-context.actions';

@Injectable()
export class PluginHooksEffects {
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

  finishDay$ = createEffect(
    () =>
      this.actions$.pipe(
        // This would need to be connected to a finish day action
        // For now, we'll leave it as a placeholder
        filter(() => false), // Never triggers for now
        tap(() => {
          this.pluginService.dispatchHook(PluginHooks.FINISH_DAY);
        }),
      ),
    { dispatch: false },
  );

  // private static hiddenActions = [];
  anyAction$ = createEffect(
    () =>
      this.actions$.pipe(
        tap((action) => {
          this.pluginService.dispatchHook(PluginHooks.ACTION, {
            action,
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
