import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store, select } from '@ngrx/store';
import { filter, map, switchMap, tap, take } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

import {
  updateTask,
  deleteTask,
  deleteTasks,
} from '../features/tasks/store/task.actions';
import { selectTaskById } from '../features/tasks/store/task.selectors';
import { Task } from '../features/tasks/task.model';
import { PluginService } from './plugin.service';
import { TaskCopy, PluginHooks } from './plugin-api.model';

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
                const taskCopy: TaskCopy = {
                  id: task.id,
                  title: task.title,
                  isDone: task.isDone,
                  timeSpent: task.timeSpent,
                  timeEstimate: task.timeEstimate,
                  created: task.created,
                };

                this.pluginService.dispatchHook(PluginHooks.TASK_COMPLETE, taskCopy);
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
                const taskCopy: TaskCopy = {
                  id: task.id,
                  title: task.title,
                  isDone: task.isDone,
                  timeSpent: task.timeSpent,
                  timeEstimate: task.timeEstimate,
                  created: task.created,
                };

                this.pluginService.dispatchHook(PluginHooks.TASK_UPDATE, taskCopy);
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

  constructor(
    private actions$: Actions,
    private store: Store,
    private pluginService: PluginService,
  ) {}
}
