import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { PlannerActions } from './planner.actions';
import { filter, first, map, mergeMap, switchMap } from 'rxjs/operators';
import { TODAY_TAG } from '../../tag/tag.const';
import { updateTaskTags } from '../../tasks/store/task.actions';
import { selectTagById } from '../../tag/store/tag.reducer';
import { updateTag } from '../../tag/store/tag.actions';
import { unique } from '../../../util/unique';

@Injectable()
export class PlannerScheduleEffects {
  // MOVE BEFORE TASK
  // ---------------
  removeTodayTagForPlannedTaskFromSchedule$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(PlannerActions.moveBeforeTask),
      filter(({ fromTask }) => fromTask.tagIds.includes(TODAY_TAG.id)),
      map(({ fromTask }) => {
        return updateTaskTags({
          task: fromTask,
          oldTagIds: fromTask.tagIds,
          newTagIds: fromTask.tagIds.filter((id) => id !== TODAY_TAG.id),
        });
      }),
    );
  });

  insertPlannedITaskIntoTodayList$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(PlannerActions.moveBeforeTask),
      // filter(({ fromTask, toTaskId }) => fromTask.tagIds.includes(TODAY_TAG.id)),
      switchMap(({ fromTask, toTaskId }) => {
        return this._store.select(selectTagById, { id: TODAY_TAG.id }).pipe(
          first(),
          filter((todayTag) => todayTag.taskIds.includes(toTaskId)),
          mergeMap((todayTag) => {
            const newTaskIds = [...todayTag.taskIds].filter((id) => id !== fromTask.id);
            const toIndex = newTaskIds.indexOf(toTaskId);
            newTaskIds.splice(toIndex, 0, fromTask.id);
            return [
              updateTag({
                tag: {
                  id: TODAY_TAG.id,
                  changes: {
                    taskIds: unique(newTaskIds),
                  },
                },
                isSkipSnack: true,
              }),
              updateTaskTags({
                task: fromTask,
                oldTagIds: fromTask.tagIds,
                newTagIds: unique([TODAY_TAG.id, ...fromTask.tagIds]),
              }),
            ];
          }),
        );
      }),
    );
  });

  constructor(
    private _actions$: Actions,
    private _store: Store,
  ) {}
}
