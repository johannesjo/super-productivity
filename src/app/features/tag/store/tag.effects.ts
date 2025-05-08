import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { selectTagFeatureState, selectTodayTagTaskIds } from './tag.reducer';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import {
  addTag,
  deleteTag,
  deleteTags,
  moveTaskInTodayTagList,
  planTasksForToday,
  updateAdvancedConfigForTag,
  updateTag,
  updateTagOrder,
  upsertTag,
} from './tag.actions';
import {
  addTask,
  convertToMainTask,
  deleteTask,
  deleteTasks,
  moveToArchive_,
  moveToOtherProject,
  restoreTask,
  updateTaskTags,
} from '../../tasks/store/task.actions';
import { TagService } from '../tag.service';
import { TaskService } from '../../tasks/task.service';
import { EMPTY, Observable, of } from 'rxjs';
import { Task } from '../../tasks/task.model';
import { WorkContextType } from '../../work-context/work-context.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { Router } from '@angular/router';
import { INBOX_TAG, TODAY_TAG } from '../tag.const';
import {
  moveTaskDownInTodayList,
  moveTaskInTodayList,
  moveTaskUpInTodayList,
} from '../../work-context/store/work-context-meta.actions';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { PlannerActions } from '../../planner/store/planner.actions';
import { deleteProject } from '../../project/store/project.actions';
import { selectAllTasksDueToday, selectTaskById } from '../../tasks/store/task.selectors';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';
import { TimeTrackingService } from '../../time-tracking/time-tracking.service';
import { fastArrayCompare } from '../../../util/fast-array-compare';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { TranslateService } from '@ngx-translate/core';
import { PlannerService } from '../../planner/planner.service';

@Injectable()
export class TagEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _pfapiService = inject(PfapiService);
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

  saveToLs$: Observable<unknown> = this._store$.pipe(
    select(selectTagFeatureState),
    take(1),
    switchMap((tagState) =>
      this._pfapiService.m.tag.save(tagState, { isUpdateRevAndLastUpdate: true }),
    ),
  );
  updateTagsStorage$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addTag,
          updateTag,
          upsertTag,
          deleteTag,
          deleteTags,

          updateTagOrder,

          updateAdvancedConfigForTag,
          moveTaskInTodayTagList,

          planTasksForToday,

          // TASK Actions
          deleteTask,
          deleteTasks,
          updateTaskTags,
          moveToArchive_,

          // PLANNER
          PlannerActions.transferTask,
          PlannerActions.moveBeforeTask,
          PlannerActions.planTaskForDay,

          // PROJECT
          deleteProject,
        ),
        switchMap(() => this.saveToLs$),
      ),
    { dispatch: false },
  );
  updateProjectStorageConditionalTask$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addTask, convertToMainTask, restoreTask),
        switchMap((a) => {
          let isChange = false;
          switch (a.type) {
            case addTask.type:
              isChange = !!a.task.tagIds.length;
              break;
            case restoreTask.type:
              isChange = !!a.task.tagIds.length;
              break;
            case convertToMainTask.type:
              isChange = !!a.parentTagIds.length;
              break;
          }
          return isChange ? of(a) : EMPTY;
        }),
        switchMap(() => this.saveToLs$),
      ),
    { dispatch: false },
  );
  updateTagsStorageConditional$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(moveTaskInTodayList, moveTaskUpInTodayList, moveTaskDownInTodayList),
        filter((p) => p.workContextType === WorkContextType.TAG),
        switchMap(() => this.saveToLs$),
      ),
    { dispatch: false },
  );

  snackUpdateBaseSettings$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTag),
        tap(
          ({ isSkipSnack }) =>
            !isSkipSnack &&
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
        ofType(planTasksForToday),
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
              extra: await this._plannerService.getSnackExtraStr(getWorklogStr()),
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

          // remove from task repeat
          const taskRepeatCfgs = await this._taskRepeatCfgService.taskRepeatCfgs$
            .pipe(take(1))
            .toPromise();
          taskRepeatCfgs.forEach((taskRepeatCfg) => {
            if (taskRepeatCfg.tagIds.some((r) => tagIdsToRemove.indexOf(r) >= 0)) {
              const tagIds = taskRepeatCfg.tagIds.filter(
                (tagId) => !tagIdsToRemove.includes(tagId),
              );
              if (tagIds.length === 0 && !taskRepeatCfg.projectId) {
                this._taskRepeatCfgService.deleteTaskRepeatCfg(
                  taskRepeatCfg.id as string,
                );
              } else {
                this._taskRepeatCfgService.updateTaskRepeatCfg(
                  taskRepeatCfg.id as string,
                  {
                    tagIds,
                  },
                );
              }
            }
          });
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

  cleanupNullTasksForTaskList: Observable<unknown> = createEffect(
    () =>
      this._workContextService.activeWorkContextTypeAndId$.pipe(
        filter(({ activeType }) => activeType === WorkContextType.TAG),
        switchMap(({ activeType, activeId }) =>
          this._workContextService.todaysTasks$.pipe(
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
        tap((arg) => console.log('Error INFO Today:', arg)),
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
          console.log('Preventing parent and subtask in today list', {
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
  preventLastTagDeletion$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(updateTaskTags),
      filter(
        ({ newTagIds, task }) =>
          newTagIds.length === 0 && !task.projectId && !task.parentId,
      ),
      tap(() => alert('preventLastTagDeletion$')),
      mergeMap(({ newTagIds, task }) => [
        upsertTag({
          tag: INBOX_TAG,
        }),
        updateTaskTags({
          task: task,
          newTagIds: [INBOX_TAG.id],
          isSkipExcludeCheck: true,
        }),
      ]),
    ),
  );

  // removeUnlistedTagWheneverTagIsAdded: any = createEffect(() =>
  //   this._actions$.pipe(
  //     ofType(updateTaskTags),
  //     filter(
  //       ({ newTagIds, task }) =>
  //         newTagIds.includes(INBOX_TAG.id) && newTagIds.length >= 1,
  //     ),
  //     tap(() => console.log('removeUnlistedTagWheneverTagIsAdded')),
  //     map(({ newTagIds, task }) =>
  //       updateTaskTags({
  //         task: {
  //           ...task,
  //           tagIds: newTagIds,
  //         },
  //         newTagIds: newTagIds.filter((id) => id !== INBOX_TAG.id),
  //         isSkipExcludeCheck: true,
  //       }),
  //     ),
  //   ),
  // );

  removeUnlistedTagWheneverProjectIsAssigned: any = createEffect(() =>
    this._actions$.pipe(
      ofType(moveToOtherProject),
      filter(
        ({ targetProjectId, task }) =>
          !!targetProjectId && task.tagIds.includes(INBOX_TAG.id),
      ),
      tap(() => console.log('removeUnlistedTagWheneverProjectIsAssigned')),
      map(({ task, targetProjectId }) =>
        updateTaskTags({
          task: { ...task, projectId: targetProjectId },
          newTagIds: task.tagIds.filter((id) => id !== INBOX_TAG.id),
          isSkipExcludeCheck: true,
        }),
      ),
    ),
  );
  removeUnlistedTagForTransferTask$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(PlannerActions.transferTask),
      filter(
        ({ task, newDay, prevDay, today }) =>
          newDay === today && prevDay !== today && task.tagIds.includes(INBOX_TAG.id),
      ),
      switchMap(({ task }) =>
        this._store$.select(selectTaskById, { id: task.id }).pipe(first()),
      ),
      filter((task) => task.tagIds.includes(INBOX_TAG.id) && task.tagIds.length >= 2),
      map((freshTask) =>
        updateTaskTags({
          task: freshTask,
          newTagIds: freshTask.tagIds.filter((id) => id !== INBOX_TAG.id),
          isSkipExcludeCheck: true,
        }),
      ),
    ),
  );

  // removeFromTodayOnDueTimeReScheduleToOtherDay$ = createEffect(
  //   () =>
  //     this._actions$.pipe(
  //       ofType(scheduleTaskWithTime),
  //       filter(({ task, dueWithTime, isMoveToBacklog, isSkipAutoRemoveFromToday }) => {
  //         const isRemoveFromToday =
  //           !isSkipAutoRemoveFromToday &&
  //           task.tagIds.includes(TODAY_TAG.id) &&
  //           (!isSameDay(new Date(), dueWithTime) || isMoveToBacklog);
  //         return isRemoveFromToday;
  //       }),
  //       map(({ task }) => {
  //         return updateTaskTags({
  //           task,
  //           newTagIds: task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id),
  //         });
  //       }),
  //     ),
  //   { dispatch: true },
  // );
}
