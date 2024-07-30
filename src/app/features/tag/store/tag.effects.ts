import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
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
  moveTaskInTagList,
  updateAdvancedConfigForTag,
  updateTag,
  updateTagOrder,
  updateWorkEndForTag,
  updateWorkStartForTag,
  upsertTag,
} from './tag.actions';
import {
  addTask,
  addTimeSpent,
  convertToMainTask,
  deleteTask,
  deleteTasks,
  moveToArchive_,
  removeTagsForAllTasks,
  restoreTask,
  updateTaskTags,
} from '../../tasks/store/task.actions';
import { TagService } from '../tag.service';
import { TaskService } from '../../tasks/task.service';
import { EMPTY, Observable, of } from 'rxjs';
import { Task, TaskArchive } from '../../tasks/task.model';
import { Tag } from '../tag.model';
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
import { DateService } from 'src/app/core/date/date.service';
import { PlannerActions } from '../../planner/store/planner.actions';

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
          moveTaskInTagList,

          // TASK Actions
          deleteTasks,
          updateTaskTags,

          // PLANNER
          PlannerActions.transferTask,
          PlannerActions.moveBeforeTask,
        ),
        switchMap(() => this.saveToLs$),
      ),
    { dispatch: false },
  );
  updateProjectStorageConditionalTask$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addTask, convertToMainTask, deleteTask, restoreTask, moveToArchive_),
        switchMap((a) => {
          let isChange = false;
          switch (a.type) {
            case addTask.type:
              isChange = !!a.task.tagIds.length;
              break;
            case deleteTask.type:
              isChange = !!a.task.tagIds.length;
              break;
            case moveToArchive_.type:
              isChange = !!a.tasks.find((task) => task.tagIds.length);
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

  updateWorkStart$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addTimeSpent),
      concatMap(({ task }) =>
        task.parentId
          ? this._taskService.getByIdOnce$(task.parentId).pipe(first())
          : of(task),
      ),
      filter((task: Task) => task.tagIds && !!task.tagIds.length),
      concatMap((task: Task) =>
        this._tagService.getTagsByIds$(task.tagIds).pipe(first()),
      ),
      concatMap((tags: Tag[]) =>
        tags
          // only if not assigned for day already
          .filter((tag) => !tag.workStart[this._dateService.todayStr()])
          .map((tag) =>
            updateWorkStartForTag({
              id: tag.id,
              date: this._dateService.todayStr(),
              newVal: Date.now(),
            }),
          ),
      ),
    ),
  );

  updateWorkEnd$: Observable<unknown> = createEffect(() =>
    this._actions$.pipe(
      ofType(addTimeSpent),
      concatMap(({ task }) =>
        task.parentId
          ? this._taskService.getByIdOnce$(task.parentId).pipe(first())
          : of(task),
      ),
      filter((task: Task) => task.tagIds && !!task.tagIds.length),
      concatMap((task: Task) =>
        this._tagService.getTagsByIds$(task.tagIds).pipe(first()),
      ),
      concatMap((tags: Tag[]) =>
        tags.map((tag) =>
          updateWorkEndForTag({
            id: tag.id,
            date: this._dateService.todayStr(),
            newVal: Date.now(),
          }),
        ),
      ),
    ),
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
          await this._persistenceService.taskArchive.execAction(
            removeTagsForAllTasks({ tagIdsToRemove }),
            true,
          );

          const isOrphanedParentTask = (t: Task): boolean =>
            !t.projectId && !t.tagIds.length && !t.parentId;

          // remove orphaned
          const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();
          const taskIdsToRemove: string[] = tasks
            .filter(isOrphanedParentTask)
            .map((t) => t.id);
          this._taskService.removeMultipleTasks(taskIdsToRemove);

          // remove orphaned for archive
          const taskArchiveState: TaskArchive =
            (await this._persistenceService.taskArchive.loadState()) ||
            createEmptyEntity();

          let archiveSubTaskIdsToDelete: string[] = [];
          const archiveMainTaskIdsToDelete: string[] = [];
          (taskArchiveState.ids as string[]).forEach((id) => {
            const t = taskArchiveState.entities[id] as Task;
            if (isOrphanedParentTask(t)) {
              archiveMainTaskIdsToDelete.push(id);
              archiveSubTaskIdsToDelete = archiveSubTaskIdsToDelete.concat(t.subTaskIds);
            }
          });

          await this._persistenceService.taskArchive.execAction(
            deleteTasks({
              taskIds: [...archiveMainTaskIdsToDelete, ...archiveSubTaskIdsToDelete],
            }),
            true,
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
    private _dateService: DateService,
  ) {}
}
