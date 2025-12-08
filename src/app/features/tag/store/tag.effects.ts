import { inject, Injectable } from '@angular/core';
import { createEffect, ofType } from '@ngrx/effects';
import { LOCAL_ACTIONS } from '../../../util/local-actions.token';
import {
  concatMap,
  distinctUntilChanged,
  filter,
  first,
  map,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectTodayTaskIds } from '../../work-context/store/work-context.selectors';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { deleteTag, deleteTags, updateTag } from './tag.actions';
import { TagService } from '../tag.service';
import { EMPTY, Observable, of } from 'rxjs';
import { WorkContextType } from '../../work-context/work-context.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { Router } from '@angular/router';
import { TODAY_TAG } from '../tag.const';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';
import { TimeTrackingService } from '../../time-tracking/time-tracking.service';
import { fastArrayCompare } from '../../../util/fast-array-compare';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { TranslateService } from '@ngx-translate/core';
import { PlannerService } from '../../planner/planner.service';
import { selectAllTasksDueToday } from '../../planner/store/planner.selectors';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { Log } from '../../../core/log';
import { devError } from '../../../util/dev-error';

@Injectable()
export class TagEffects {
  private _actions$ = inject(LOCAL_ACTIONS);
  private _store$ = inject<Store<any>>(Store);
  private _snackService = inject(SnackService);
  private _tagService = inject(TagService);
  private _workContextService = inject(WorkContextService);
  private _router = inject(Router);
  private _taskArchiveService = inject(TaskArchiveService);
  private _timeTrackingService = inject(TimeTrackingService);
  private _translateService = inject(TranslateService);
  private _plannerService = inject(PlannerService);

  snackUpdateBaseSettings$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTag),
        tap(
          (action) =>
            !action.isSkipSnack &&
            this._snackService.open({
              type: 'SUCCESS',
              msg: T.F.TAG.S.UPDATED,
            }),
        ),
      ),
    { dispatch: false },
  );

  snackPlanForToday$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.planTasksForToday),
        filter(({ isShowSnack }) => !!isShowSnack),
        tap(async ({ taskIds }) => {
          // if (taskIds.length === 1) {
          //   const task = await this._taskService.getByIdOnce$(taskIds[0]).toPromise();
          // }
          const formattedDate = this._translateService.instant(T.G.TODAY_TAG_TITLE);
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.PLANNER.S.TASK_PLANNED_FOR,
            ico: 'today',
            translateParams: {
              date: formattedDate,
              extra: await this._plannerService.getSnackExtraStr(getDbDateStr()),
            },
          });
        }),
      ),
    { dispatch: false },
  );

  /**
   * Handles async cleanup when tags are deleted.
   *
   * NOTE: Most tag deletion cleanup is now handled atomically in the meta-reducer
   * (tag-shared.reducer.ts), including:
   * - Removing tag references from tasks
   * - Deleting orphaned tasks (no project, no tags, no parent)
   * - Cleaning up task repeat configs
   * - Cleaning up current time tracking state
   *
   * This effect only handles async operations that can't be in a reducer:
   * - Archive cleanup (IndexedDB, not NgRx state)
   * - Archive time tracking cleanup (IndexedDB, not NgRx state)
   */
  deleteTagRelatedData: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteTag, deleteTags),
        map((a: any) => (a.ids ? a.ids : [a.id])),
        concatMap(async (tagIdsToRemove: string[]) => {
          try {
            // Remove tags from archived tasks (async - IndexedDB, not NgRx state)
            await this._taskArchiveService.removeTagsFromAllTasks(tagIdsToRemove);

            // Clean up time tracking data in archives (async - IndexedDB)
            // Note: Current time tracking state is handled in the meta-reducer
            for (const tagId of tagIdsToRemove) {
              await this._timeTrackingService.cleanupArchiveDataForTag(tagId);
            }
          } catch (e) {
            // Archive cleanup is non-critical - log and notify but don't break
            devError('[TagEffects] Failed to clean up tag archive data');
            this._snackService.open({
              type: 'ERROR',
              msg: T.F.TAG.S.ARCHIVE_CLEANUP_FAILED,
            });
          }
          return tagIdsToRemove;
        }),
      ),
    { dispatch: false },
  );

  redirectIfCurrentTagIsDeleted: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteTag, deleteTags),
        map((a: any) => (a.ids ? a.ids : [a.id])),
        tap(async (tagIdsToRemove: string[]) => {
          if (
            tagIdsToRemove.includes(
              this._workContextService.activeWorkContextId as string,
            )
          ) {
            this._router.navigate([`tag/${TODAY_TAG.id}/tasks`]);
          }
        }),
      ),
    { dispatch: false },
  );

  cleanupNullTasksForTaskList$: Observable<unknown> = createEffect(
    () =>
      this._workContextService.activeWorkContextTypeAndId$.pipe(
        filter(({ activeType }) => activeType === WorkContextType.TAG),
        switchMap(({ activeType, activeId }) =>
          this._workContextService.mainListTasks$.pipe(
            take(1),
            map((tasks) => ({
              allTasks: tasks,
              nullTasks: tasks.filter((task) => !task),
              activeType,
              activeId,
            })),
          ),
        ),
        filter(({ nullTasks }) => nullTasks.length > 0),
        tap((arg) => Log.log('Error INFO Today:', arg)),
        tap(({ activeId, allTasks }) => {
          const allIds = allTasks.map((t) => t && t.id);
          const r = confirm(
            'Nooo! We found some tasks with no data. It is strongly recommended to delete them to avoid further data corruption. Delete them now?',
          );
          if (r) {
            this._tagService.updateTag(activeId, {
              taskIds: allIds.filter((id) => !!id),
            });
            alert('Done!');
          }
        }),
      ),
    { dispatch: false },
  );

  // Uses selectTodayTaskIds which already computes membership from task.dueDay (virtual tag pattern)
  preventParentAndSubTaskInTodayList$: any = createEffect(() =>
    this._store$.select(selectTodayTaskIds).pipe(
      filter((v) => v.length > 0),
      distinctUntilChanged(fastArrayCompare),
      // NOTE: wait a bit for potential effects to be executed
      switchMap((todayTaskIds) =>
        this._store$.select(selectAllTasksDueToday).pipe(
          first(),
          map((allTasksDueToday) => ({ allTasksDueToday, todayTaskIds })),
        ),
      ),
      switchMap(({ allTasksDueToday, todayTaskIds }) => {
        const tasksWithParentInListIds = allTasksDueToday
          .filter((t) => t.parentId && todayTaskIds.includes(t.parentId))
          .map((t) => t.id);

        const dueNotInListIds = allTasksDueToday
          .filter((t) => !todayTaskIds.includes(t.id))
          .map((t) => t.id);

        const newTaskIds = [...todayTaskIds, ...dueNotInListIds].filter(
          (id) => !tasksWithParentInListIds.includes(id),
        );

        // Only dispatch if the taskIds actually change
        const isChanged =
          newTaskIds.length !== todayTaskIds.length ||
          newTaskIds.some((id, i) => id !== todayTaskIds[i]);

        if (isChanged && (tasksWithParentInListIds.length || dueNotInListIds.length)) {
          Log.log('Preventing parent and subtask in today list', {
            isChanged,
            tasksWithParentInListIds,
            dueNotInListIds,
            todayTaskIds,
            newTaskIds,
          });

          return of(
            updateTag({
              tag: {
                id: TODAY_TAG.id,
                changes: {
                  taskIds: newTaskIds,
                },
              },
              isSkipSnack: true,
            }),
          );
        }

        return EMPTY;
      }),
    ),
  );
  // PREVENT LAST TAG DELETION ACTIONS
  // ---------------------------------------------
}
