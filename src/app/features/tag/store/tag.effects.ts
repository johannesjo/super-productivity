import { Injectable } from '@angular/core';
import { Actions, createEffect, Effect, ofType } from '@ngrx/effects';
import { concatMap, filter, first, map, switchMap, take, tap } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { selectTagFeatureState } from './tag.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import {
  addTag,
  addToBreakTimeForTag,
  deleteTag,
  deleteTags,
  updateAdvancedConfigForTag,
  updateTag,
  updateTagOrder,
  updateWorkEndForTag,
  updateWorkStartForTag,
  upsertTag,
} from './tag.actions';
import {
  AddTask,
  AddTimeSpent,
  ConvertToMainTask,
  DeleteMainTasks,
  DeleteTask,
  MoveToArchive,
  RemoveTagsForAllTasks,
  RestoreTask,
  TaskActionTypes,
} from '../../tasks/store/task.actions';
import { TagService } from '../tag.service';
import { TaskService } from '../../tasks/task.service';
import { EMPTY, Observable, of } from 'rxjs';
import { Task, TaskArchive } from '../../tasks/task.model';
import { Tag } from '../tag.model';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { WorkContextType } from '../../work-context/work-context.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { Router } from '@angular/router';
import { TODAY_TAG } from '../tag.const';
import { createEmptyEntity } from '../../../util/create-empty-entity';
import {
  moveTaskDownInTodayList,
  moveTaskInTodayList,
  moveTaskUpInTodayList,
} from '../../work-context/store/work-context-meta.actions';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';

@Injectable()
export class TagEffects {
  saveToLs$: Observable<unknown> = this._store$.pipe(
    select(selectTagFeatureState),
    take(1),
    switchMap((tagState) =>
      this._persistenceService.tag.saveState(tagState, { isSyncModelChange: true }),
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
          updateWorkStartForTag,
          updateWorkEndForTag,
          addToBreakTimeForTag,

          TaskActionTypes.DeleteMainTasks,
          TaskActionTypes.UpdateTaskTags,
        ),
        switchMap(() => this.saveToLs$),
      ),
    { dispatch: false },
  );
  updateProjectStorageConditionalTask$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          TaskActionTypes.AddTask,
          TaskActionTypes.ConvertToMainTask,
          TaskActionTypes.DeleteTask,
          TaskActionTypes.RestoreTask,
          TaskActionTypes.MoveToArchive,
        ),
        switchMap(
          (a: AddTask | ConvertToMainTask | DeleteTask | RestoreTask | MoveToArchive) => {
            let isChange = false;
            switch (a.type) {
              case TaskActionTypes.AddTask:
                isChange = !!(a as AddTask).payload.task.tagIds.length;
                break;
              case TaskActionTypes.DeleteTask:
                isChange = !!(a as DeleteTask).payload.task.tagIds.length;
                break;
              case TaskActionTypes.MoveToArchive:
                isChange = !!(a as MoveToArchive).payload.tasks.find(
                  (task) => task.tagIds.length,
                );
                break;
              case TaskActionTypes.RestoreTask:
                isChange = !!(a as RestoreTask).payload.task.tagIds.length;
                break;
              case TaskActionTypes.ConvertToMainTask:
                isChange = !!(a as ConvertToMainTask).payload.parentTagIds.length;
                break;
            }
            return isChange ? of(a) : EMPTY;
          },
        ),
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
  @Effect({ dispatch: false })
  snackUpdateBaseSettings$: any = this._actions$.pipe(
    ofType(updateTag),
    tap(() =>
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.TAG.S.UPDATED,
      }),
    ),
  );

  @Effect()
  updateWorkStart$: any = this._actions$.pipe(
    ofType(TaskActionTypes.AddTimeSpent),
    concatMap(({ payload }: AddTimeSpent) =>
      payload.task.parentId
        ? this._taskService.getByIdOnce$(payload.task.parentId).pipe(first())
        : of(payload.task),
    ),
    filter((task: Task) => task.tagIds && !!task.tagIds.length),
    concatMap((task: Task) => this._tagService.getTagsByIds$(task.tagIds).pipe(first())),
    concatMap((tags: Tag[]) =>
      tags
        // only if not assigned for day already
        .filter((tag) => !tag.workStart[getWorklogStr()])
        .map((tag) =>
          updateWorkStartForTag({
            id: tag.id,
            date: getWorklogStr(),
            newVal: Date.now(),
          }),
        ),
    ),
  );

  @Effect()
  updateWorkEnd$: Observable<unknown> = this._actions$.pipe(
    ofType(TaskActionTypes.AddTimeSpent),
    concatMap(({ payload }: AddTimeSpent) =>
      payload.task.parentId
        ? this._taskService.getByIdOnce$(payload.task.parentId).pipe(first())
        : of(payload.task),
    ),
    filter((task: Task) => task.tagIds && !!task.tagIds.length),
    concatMap((task: Task) => this._tagService.getTagsByIds$(task.tagIds).pipe(first())),
    concatMap((tags: Tag[]) =>
      tags.map((tag) =>
        updateWorkEndForTag({
          id: tag.id,
          date: getWorklogStr(),
          newVal: Date.now(),
        }),
      ),
    ),
  );

  @Effect({ dispatch: false })
  deleteTagRelatedData: Observable<unknown> = this._actions$.pipe(
    ofType(deleteTag, deleteTags),
    map((a: any) => (a.ids ? a.ids : [a.id])),
    tap(async (tagIdsToRemove: string[]) => {
      // remove from all tasks
      this._taskService.removeTagsForAllTask(tagIdsToRemove);
      // remove from archive
      await this._persistenceService.taskArchive.execAction(
        new RemoveTagsForAllTasks({ tagIdsToRemove }),
      );

      const isOrphanedParentTask = (t: Task) =>
        !t.projectId && !t.tagIds.length && !t.parentId;

      // remove orphaned
      const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();
      const taskIdsToRemove: string[] = tasks
        .filter(isOrphanedParentTask)
        .map((t) => t.id);
      this._taskService.removeMultipleMainTasks(taskIdsToRemove);

      // remove orphaned for archive
      const taskArchiveState: TaskArchive =
        (await this._persistenceService.taskArchive.loadState()) || createEmptyEntity();
      const archiveTaskIdsToDelete = (taskArchiveState.ids as string[]).filter((id) => {
        const t = taskArchiveState.entities[id] as Task;
        return isOrphanedParentTask(t);
      });
      await this._persistenceService.taskArchive.execAction(
        new DeleteMainTasks({ taskIds: archiveTaskIdsToDelete }),
      );

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
            this._taskRepeatCfgService.deleteTaskRepeatCfg(taskRepeatCfg.id as string);
          } else {
            this._taskRepeatCfgService.updateTaskRepeatCfg(taskRepeatCfg.id as string, {
              tagIds,
            });
          }
        }
      });
    }),
  );

  @Effect({ dispatch: false })
  redirectIfCurrentTagIsDeleted: Observable<unknown> = this._actions$.pipe(
    ofType(deleteTag, deleteTags),
    map((a: any) => (a.ids ? a.ids : [a.id])),
    tap(async (tagIdsToRemove: string[]) => {
      if (
        tagIdsToRemove.includes(this._workContextService.activeWorkContextId as string)
      ) {
        this._router.navigate([`tag/${TODAY_TAG.id}/tasks`]);
      }
    }),
  );

  @Effect({ dispatch: false })
  cleanupNullTasksForTaskList: Observable<unknown> = this._workContextService.activeWorkContextTypeAndId$.pipe(
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
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _snackService: SnackService,
    private _tagService: TagService,
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _router: Router,
  ) {}
}
