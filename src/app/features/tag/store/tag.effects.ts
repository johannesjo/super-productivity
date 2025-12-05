import { inject, Injectable } from '@angular/core';
import { createEffect, ofType } from '@ngrx/effects';
import { LOCAL_ACTIONS } from '../../../util/local-actions.token';
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectTodayTagTaskIds } from './tag.reducer';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { deleteTag, deleteTags, updateTag } from './tag.actions';
import { TagService } from '../tag.service';
import { TaskService } from '../../tasks/task.service';
import { EMPTY, Observable, of } from 'rxjs';
import { Task } from '../../tasks/task.model';
import { WorkContextType } from '../../work-context/work-context.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { Router } from '@angular/router';
import { TODAY_TAG } from '../tag.const';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';
import { TimeTrackingService } from '../../time-tracking/time-tracking.service';
import { fastArrayCompare } from '../../../util/fast-array-compare';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { TranslateService } from '@ngx-translate/core';
import { PlannerService } from '../../planner/planner.service';
import { selectAllTasksDueToday } from '../../planner/store/planner.selectors';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { Log } from '../../../core/log';

@Injectable()
export class TagEffects {
  private _actions$ = inject(LOCAL_ACTIONS);
  private _store$ = inject<Store<any>>(Store);
  private _snackService = inject(SnackService);
  private _tagService = inject(TagService);
  private _workContextService = inject(WorkContextService);
  private _taskService = inject(TaskService);
  private _taskRepeatCfgService = inject(TaskRepeatCfgService);
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

  deleteTagRelatedData: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteTag, deleteTags),
        map((a: any) => (a.ids ? a.ids : [a.id])),
        tap(async (tagIdsToRemove: string[]) => {
          // remove from all tasks
          this._taskService.removeTagsForAllTask(tagIdsToRemove);
          // remove from archive
          await this._taskArchiveService.removeTagsFromAllTasks(tagIdsToRemove);

          const isOrphanedParentTask = (t: Task): boolean =>
            !t.projectId && !t.tagIds.length && !t.parentId;

          // remove orphaned
          const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();
          const taskIdsToRemove: string[] = tasks
            .filter(isOrphanedParentTask)
            .map((t) => t.id);
          this._taskService.removeMultipleTasks(taskIdsToRemove);

          tagIdsToRemove.forEach((id) => {
            this._timeTrackingService.cleanupDataEverywhereForTag(id);
          });

          // remove from task repeat - using bulk operations to reduce operation count
          const taskRepeatCfgs = await this._taskRepeatCfgService.taskRepeatCfgs$
            .pipe(take(1))
            .toPromise();

          // Collect configs that need to be deleted (orphaned) vs updated
          const cfgIdsToDelete: string[] = [];
          const cfgIdsToUpdate: string[] = [];

          taskRepeatCfgs.forEach((taskRepeatCfg) => {
            if (taskRepeatCfg.tagIds.some((r) => tagIdsToRemove.indexOf(r) >= 0)) {
              const remainingTagIds = taskRepeatCfg.tagIds.filter(
                (tagId) => !tagIdsToRemove.includes(tagId),
              );
              if (remainingTagIds.length === 0 && !taskRepeatCfg.projectId) {
                // Config becomes orphaned (no tags and no project) - delete it
                cfgIdsToDelete.push(taskRepeatCfg.id as string);
              } else {
                // Config still has tags or a project - update to remove deleted tags
                cfgIdsToUpdate.push(taskRepeatCfg.id as string);
              }
            }
          });

          // Use bulk delete for orphaned configs (no task cleanup needed since
          // tasks are already cleaned up via removeTagsForAllTask above)
          if (cfgIdsToDelete.length > 0) {
            this._taskRepeatCfgService.deleteTaskRepeatCfgsNoTaskCleanup(cfgIdsToDelete);
          }

          // Update remaining configs to remove the deleted tags
          // Note: Each config may have different remaining tagIds, so we need
          // individual updates. Bulk update would require the same changes for all.
          if (cfgIdsToUpdate.length > 0) {
            cfgIdsToUpdate.forEach((cfgId) => {
              const cfg = taskRepeatCfgs.find((c) => c.id === cfgId);
              if (cfg) {
                const remainingTagIds = cfg.tagIds.filter(
                  (tagId) => !tagIdsToRemove.includes(tagId),
                );
                this._taskRepeatCfgService.updateTaskRepeatCfg(cfgId, {
                  tagIds: remainingTagIds,
                });
              }
            });
          }
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

  preventParentAndSubTaskInTodayList$: any = createEffect(() =>
    this._store$.select(selectTodayTagTaskIds).pipe(
      filter((v) => v.length > 0),
      distinctUntilChanged(fastArrayCompare),
      // NOTE: wait a bit for potential effects to be executed
      switchMap((todayTagTaskIds) =>
        this._store$.select(selectAllTasksDueToday).pipe(
          first(),
          map((allTasksDueToday) => ({ allTasksDueToday, todayTagTaskIds })),
        ),
      ),
      switchMap(({ allTasksDueToday, todayTagTaskIds }) => {
        const tasksWithParentInListIds = allTasksDueToday
          .filter((t) => t.parentId && todayTagTaskIds.includes(t.parentId))
          .map((t) => t.id);

        const dueNotInListIds = allTasksDueToday
          .filter((t) => !todayTagTaskIds.includes(t.id))
          .map((t) => t.id);

        const newTaskIds = [...todayTagTaskIds, ...dueNotInListIds].filter(
          (id) => !tasksWithParentInListIds.includes(id),
        );

        // Only dispatch if the taskIds actually change
        const isChanged =
          newTaskIds.length !== todayTagTaskIds.length ||
          newTaskIds.some((id, i) => id !== todayTagTaskIds[i]);

        if (isChanged && (tasksWithParentInListIds.length || dueNotInListIds.length)) {
          Log.log('Preventing parent and subtask in today list', {
            isChanged,
            tasksWithParentInListIds,
            dueNotInListIds,
            todayTagTaskIds,
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
