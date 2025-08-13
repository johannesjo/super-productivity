import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { filter, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { Task } from '../task.model';
import { moveTaskInTodayList } from '../../work-context/store/work-context-meta.actions';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskService } from '../task.service';
import { EMPTY, Observable } from 'rxjs';
import { moveProjectTaskToRegularList } from '../../project/store/project.actions';
import { TimeTrackingActions } from '../../time-tracking/store/time-tracking.actions';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';
import { Store } from '@ngrx/store';
import { selectTodayTagTaskIds } from '../../tag/store/tag.reducer';

@Injectable()
export class TaskRelatedModelEffects {
  private _actions$ = inject(Actions);
  private _taskService = inject(TaskService);
  private _globalConfigService = inject(GlobalConfigService);
  private _store = inject(Store);
  private _taskArchiveService = inject(TaskArchiveService);

  // EFFECTS ===> EXTERNAL
  // ---------------------

  restoreTask$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.restoreTask),
        tap(({ task }) => this._removeFromArchive(task)),
      ),
    { dispatch: false },
  );

  ifAutoAddTodayEnabled$ = <T>(obs: Observable<T>): Observable<T> =>
    this._globalConfigService.misc$.pipe(
      switchMap((misc) => (misc.isAutoAddWorkedOnToToday ? obs : EMPTY)),
    );

  autoAddTodayTagOnTracking = createEffect(() =>
    this.ifAutoAddTodayEnabled$(
      this._actions$.pipe(
        ofType(TimeTrackingActions.addTimeSpent),
        withLatestFrom(this._store.select(selectTodayTagTaskIds)),
        filter(
          ([{ task }, todayTaskIds]) =>
            !todayTaskIds.includes(task.id) &&
            (!task.parentId || !todayTaskIds.includes(task.parentId)),
        ),
        map(([{ task }]) =>
          TaskSharedActions.planTasksForToday({
            taskIds: [task.id],
          }),
        ),
      ),
    ),
  );

  autoAddTodayTagOnMarkAsDone = createEffect(() =>
    this.ifAutoAddTodayEnabled$(
      this._actions$.pipe(
        ofType(TaskSharedActions.updateTask),
        filter((a) => a.task.changes.isDone === true),
        switchMap(({ task }) => this._taskService.getByIdOnce$(task.id as string)),
        filter((task: Task) => !task.parentId),
        map((task) =>
          TaskSharedActions.planTasksForToday({
            taskIds: [task.id],
          }),
        ),
      ),
    ),
  );

  // EXTERNAL ===> TASKS
  // -------------------

  moveTaskToUnDone$ = createEffect(() =>
    this._actions$.pipe(
      ofType(moveTaskInTodayList, moveProjectTaskToRegularList),
      filter(
        ({ src, target }) => (src === 'DONE' || src === 'BACKLOG') && target === 'UNDONE',
      ),
      map(({ taskId }) =>
        TaskSharedActions.updateTask({
          task: {
            id: taskId,
            changes: {
              isDone: false,
            },
          },
        }),
      ),
    ),
  );

  moveTaskToDone$ = createEffect(() =>
    this._actions$.pipe(
      ofType(moveTaskInTodayList, moveProjectTaskToRegularList),
      filter(
        ({ src, target }) => (src === 'UNDONE' || src === 'BACKLOG') && target === 'DONE',
      ),
      map(({ taskId }) =>
        TaskSharedActions.updateTask({
          task: {
            id: taskId,
            changes: {
              isDone: true,
            },
          },
        }),
      ),
    ),
  );

  // NOTE: This effect is temporarily disabled as we migrate away from updateTaskTags
  // The tag exclusion logic for parent/child tasks needs to be revisited
  // excludeNewTagsFromParentOrChildren$: any = createEffect(() =>
  //   this._actions$.pipe(
  //     ofType(TaskSharedActions.updateTask),
  //     // TODO: Need to handle the isSkipExcludeCheck logic differently
  //     // filter(({ isSkipExcludeCheck }) => !isSkipExcludeCheck),
  //     switchMap(({ task }) => {
  //       // Implementation needs to be updated to work with updateTask action
  //       return EMPTY;
  //     }),
  //   ),
  // );

  private async _removeFromArchive(task: Task): Promise<unknown> {
    const taskIds = [task.id, ...task.subTaskIds];
    return this._taskArchiveService.deleteTasks(taskIds);
  }
}
