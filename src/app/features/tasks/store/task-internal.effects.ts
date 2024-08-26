import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addSubTask,
  addTask,
  deleteTask,
  moveToArchive_,
  setCurrentTask,
  toggleStart,
  unsetCurrentTask,
  updateTask,
} from './task.actions';
import { select, Store } from '@ngrx/store';
import { filter, map, mergeMap, withLatestFrom } from 'rxjs/operators';
import { selectTaskFeatureState } from './task.selectors';
import {
  selectConfigFeatureState,
  selectMiscConfig,
} from '../../config/store/global-config.reducer';
import { Task, TaskState } from '../task.model';
import { EMPTY, of } from 'rxjs';
import { WorkContextService } from '../../work-context/work-context.service';
import {
  moveProjectTaskToBacklogList,
  moveProjectTaskToBacklogListAuto,
} from '../../project/store/project.actions';

@Injectable()
export class TaskInternalEffects {
  onAllSubTasksDone$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(updateTask),
      withLatestFrom(
        this._store$.pipe(select(selectMiscConfig)),
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      filter(
        ([{ task }, miscCfg, state]) =>
          !!miscCfg &&
          miscCfg.isAutMarkParentAsDone &&
          !!task.changes.isDone &&
          // @ts-ignore
          !!state.entities[task.id].parentId,
      ),
      filter(([action, miscCfg, state]) => {
        const task = state.entities[action.task.id];
        if (!task || !task.parentId) {
          throw new Error('!task || !task.parentId');
        }
        const parent = state.entities[task.parentId] as Task;
        const undoneSubTasks = parent.subTaskIds.filter(
          (id) => !(state.entities[id] as Task).isDone,
        );
        return undoneSubTasks.length === 0;
      }),
      map(([action, miscCfg, state]) =>
        updateTask({
          task: {
            id: (state.entities[action.task.id] as Task).parentId as string,
            changes: { isDone: true },
          },
        }),
      ),
    ),
  );

  setDefaultEstimateIfNonGiven$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addTask, addSubTask),
      filter(({ task }) => !task.timeEstimate),
      withLatestFrom(this._store$.pipe(select(selectConfigFeatureState))),
      filter(
        ([{ task }, cfg]) =>
          (!task.timeEstimate && cfg.timeTracking.defaultEstimate > 0) ||
          cfg.timeTracking.defaultEstimateSubTasks > 0,
      ),
      map(([action, cfg]) =>
        updateTask({
          task: {
            id: action.task.id,
            changes: {
              timeEstimate:
                action.task.parentId || (action as any).parentId
                  ? cfg.timeTracking.defaultEstimateSubTasks
                  : cfg.timeTracking.defaultEstimate,
            },
          },
        }),
      ),
    ),
  );

  autoSetNextTask$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(
        toggleStart,
        updateTask,
        deleteTask,
        moveToArchive_,

        moveProjectTaskToBacklogList.type,
        moveProjectTaskToBacklogListAuto.type,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectConfigFeatureState)),
        this._store$.pipe(select(selectTaskFeatureState)),
        this._workContextSession.todaysTaskIds$,
        (action, globalCfg, state, todaysTaskIds) => ({
          action,
          state,
          isAutoStartNextTask: globalCfg.timeTracking.isAutoStartNextTask,
          todaysTaskIds,
        }),
      ),
      mergeMap(({ action, state, isAutoStartNextTask, todaysTaskIds }) => {
        const currentId = state.currentTaskId;
        let nextId: 'NO_UPDATE' | string | null;

        switch (action.type) {
          case toggleStart.type: {
            nextId = state.currentTaskId
              ? null
              : this._findNextTask(state, todaysTaskIds);
            break;
          }

          case updateTask.type: {
            // TODO fix typing here
            const a = action as any;
            const { isDone } = a.task.changes;
            const oldId = a.task.id;
            const isCurrent = oldId === currentId;
            nextId =
              isDone && isCurrent
                ? isAutoStartNextTask
                  ? this._findNextTask(state, todaysTaskIds, oldId as string)
                  : null
                : 'NO_UPDATE';
            break;
          }

          case moveProjectTaskToBacklogList.type:
          case moveProjectTaskToBacklogListAuto.type: {
            const isCurrent = currentId === (action as any).taskId;
            nextId = isCurrent ? null : 'NO_UPDATE';
            break;
          }

          // QUICK FIX FOR THE ISSUE
          // TODO better solution
          case deleteTask.type: {
            nextId = state.currentTaskId;
            break;
          }
          default:
            nextId = null;

          // NOTE: currently no solution for this, but we're probably fine, as the current task
          // gets unset every time we go to the finish day view
          // case moveToArchive_: {}
        }

        if (nextId === 'NO_UPDATE') {
          return EMPTY;
        } else {
          if (nextId) {
            return of(setCurrentTask({ id: nextId }));
          } else {
            return of(unsetCurrentTask());
          }
        }
      }),
    ),
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _workContextSession: WorkContextService,
  ) {}

  private _findNextTask(
    state: TaskState,
    todaysTaskIds: string[],
    oldCurrentId?: string,
  ): string | null {
    let nextId: string | null = null;
    const { entities } = state;

    const filterUndoneNotCurrent = (id: string): boolean =>
      !(entities[id] as Task).isDone && id !== oldCurrentId;
    const flattenToSelectable = (arr: string[]): string[] =>
      arr.reduce((acc: string[], next: string) => {
        return (entities[next] as Task).subTaskIds.length > 0
          ? acc.concat((entities[next] as Task).subTaskIds)
          : acc.concat(next);
      }, []);

    if (oldCurrentId) {
      const oldCurTask = entities[oldCurrentId];
      if (oldCurTask && oldCurTask.parentId) {
        (entities[oldCurTask.parentId] as Task).subTaskIds.some((id) => {
          return id !== oldCurrentId && !(entities[id] as Task).isDone
            ? (nextId = id) && true // assign !!!
            : false;
        });
      }

      if (!nextId) {
        const oldCurIndex = todaysTaskIds.indexOf(oldCurrentId);
        const mainTasksBefore = todaysTaskIds.slice(0, oldCurIndex);
        const mainTasksAfter = todaysTaskIds.slice(oldCurIndex + 1);
        const selectableBefore = flattenToSelectable(mainTasksBefore);
        const selectableAfter = flattenToSelectable(mainTasksAfter);
        nextId =
          selectableAfter.find(filterUndoneNotCurrent) ||
          selectableBefore.reverse().find(filterUndoneNotCurrent) ||
          null;
        nextId = Array.isArray(nextId) ? nextId[0] : nextId;
      }
    } else {
      const lastTask = state.lastCurrentTaskId && entities[state.lastCurrentTaskId];
      const isLastSelectable =
        state.lastCurrentTaskId &&
        lastTask &&
        !lastTask.isDone &&
        !lastTask.subTaskIds.length;
      if (isLastSelectable) {
        nextId = state.lastCurrentTaskId;
      } else {
        const selectable =
          flattenToSelectable(todaysTaskIds).find(filterUndoneNotCurrent);
        nextId = Array.isArray(selectable) ? selectable[0] : selectable;
      }
    }

    return nextId;
  }
}
