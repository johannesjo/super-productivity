import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addTimeSpent,
  moveToArchive_,
  moveToOtherProject,
  restoreTask,
  updateTask,
  updateTaskTags,
} from './task.actions';
import { concatMap, filter, first, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { Task, TaskArchive, TaskCopy, TaskWithSubTasks } from '../task.model';
import { ReminderService } from '../../reminder/reminder.service';
import { moveTaskInTodayList } from '../../work-context/store/work-context-meta.actions';
import { taskAdapter } from './task.adapter';
import { flattenTasks } from './task.selectors';
import { GlobalConfigService } from '../../config/global-config.service';
import { NO_LIST_TAG, TODAY_TAG } from '../../tag/tag.const';
import { unique } from '../../../util/unique';
import { TaskService } from '../task.service';
import { EMPTY, Observable, of } from 'rxjs';
import { createEmptyEntity } from '../../../util/create-empty-entity';
import { moveProjectTaskToTodayList } from '../../project/store/project.actions';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from '../../../t.const';
import { upsertTag } from '../../tag/store/tag.actions';

@Injectable()
export class TaskRelatedModelEffects {
  // EFFECTS ===> EXTERNAL
  // ---------------------

  moveToArchive$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(moveToArchive_),
        tap(({ tasks }) => this._moveToArchive(tasks)),
      ),
    { dispatch: false },
  );

  restoreTask$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(restoreTask),
        tap(({ task }) => this._removeFromArchive(task)),
      ),
    { dispatch: false },
  );

  ifAutoAddTodayEnabled$ = <T>(obs: Observable<T>): Observable<T> =>
    this._globalConfigService.misc$.pipe(
      switchMap((misc) => (misc.isAutoAddWorkedOnToToday ? obs : EMPTY)),
    );

  autoAddTodayTagOnTracking: any = createEffect(() =>
    this.ifAutoAddTodayEnabled$(
      this._actions$.pipe(
        ofType(addTimeSpent),
        switchMap(({ task }) =>
          task.parentId
            ? this._taskService.getByIdOnce$(task.parentId).pipe(
                map((parent) => ({
                  parent,
                  task,
                })),
              )
            : of({ parent: undefined, task }),
        ),
        filter(
          ({ task, parent }: { task: TaskCopy; parent?: TaskCopy }) =>
            !task.tagIds.includes(TODAY_TAG.id) &&
            (!parent || !parent.tagIds.includes(TODAY_TAG.id)),
        ),
        map(({ task }) =>
          updateTaskTags({
            task,
            newTagIds: unique([...task.tagIds, TODAY_TAG.id]),
            oldTagIds: task.tagIds,
          }),
        ),
      ),
    ),
  );

  autoAddTodayTagOnMarkAsDone: any = createEffect(() =>
    this.ifAutoAddTodayEnabled$(
      this._actions$.pipe(
        ofType(updateTask),
        filter((a) => a.task.changes.isDone === true),
        switchMap(({ task }) => this._taskService.getByIdOnce$(task.id as string)),
        filter((task: Task) => !task.parentId && !task.tagIds.includes(TODAY_TAG.id)),
        map((task) =>
          updateTaskTags({
            task,
            newTagIds: unique([...task.tagIds, TODAY_TAG.id]),
            oldTagIds: task.tagIds,
          }),
        ),
      ),
    ),
  );

  // EXTERNAL ===> TASKS
  // -------------------

  moveTaskToUnDone$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(moveTaskInTodayList, moveProjectTaskToTodayList),
      filter(
        ({ src, target }) => (src === 'DONE' || src === 'BACKLOG') && target === 'UNDONE',
      ),
      map(({ taskId }) =>
        updateTask({
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

  moveTaskToDone$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(moveTaskInTodayList, moveProjectTaskToTodayList),
      filter(
        ({ src, target }) => (src === 'UNDONE' || src === 'BACKLOG') && target === 'DONE',
      ),
      map(({ taskId }) =>
        updateTask({
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

  preventAndRevertLastTagDeletion$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(updateTaskTags),
      filter(
        ({ newTagIds, task }) =>
          newTagIds.length === 0 && !task.projectId && !task.parentId,
      ),
      // tap(() => console.log('preventAndRevertLastTagDeletion$')),
      mergeMap(({ oldTagIds, newTagIds, task }) => [
        upsertTag({
          tag: NO_LIST_TAG,
        }),
        updateTaskTags({
          task: task,
          oldTagIds: newTagIds,
          newTagIds: [NO_LIST_TAG.id],
          isSkipExcludeCheck: true,
        }),
      ]),
      // tap(() => {
      //   // NOTE: timeout to make sure this is shown after other messages
      //   setTimeout(() => {
      //     this._snackService.open({
      //       type: 'ERROR',
      //       msg: T.F.TASK.S.LAST_TAG_DELETION_WARNING ,
      //     });
      //   }, 0);
      // }),
    ),
  );

  removeUnlistedTagWheneverTagIsAdded: any = createEffect(() =>
    this._actions$.pipe(
      ofType(updateTaskTags),
      filter(
        ({ newTagIds, task }) =>
          newTagIds.includes(NO_LIST_TAG.id) && newTagIds.length >= 2,
      ),
      // tap(() => console.log('removeUnlistedTagWheneverTagIsAdded')),
      map(({ oldTagIds, newTagIds, task }) =>
        updateTaskTags({
          task: task,
          oldTagIds: newTagIds,
          newTagIds: newTagIds.filter((id) => id !== NO_LIST_TAG.id),
          isSkipExcludeCheck: true,
        }),
      ),
    ),
  );
  removeUnlistedTagWheneverProjectIsAssigned: any = createEffect(() =>
    this._actions$.pipe(
      ofType(moveToOtherProject),
      filter(
        ({ targetProjectId, task }) =>
          !!targetProjectId && task.tagIds.includes(NO_LIST_TAG.id),
      ),
      // tap(() => console.log('removeUnlistedTagWheneverProjectIsAssigned')),
      map(({ task, targetProjectId }) =>
        updateTaskTags({
          task: { ...task, projectId: targetProjectId },
          oldTagIds: task.tagIds,
          newTagIds: task.tagIds.filter((id) => id !== NO_LIST_TAG.id),
          isSkipExcludeCheck: true,
        }),
      ),
    ),
  );

  excludeNewTagsFromParentOrChildren$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(updateTaskTags),
      filter(({ isSkipExcludeCheck }) => !isSkipExcludeCheck),
      switchMap(({ task, newTagIds, oldTagIds }) => {
        if (task.parentId) {
          return this._taskService.getByIdOnce$(task.parentId).pipe(
            switchMap((parentTask) => {
              const isNewTagsConflictWithParent = !!(
                parentTask && parentTask.tagIds.find((ptid) => newTagIds.includes(ptid))
              );

              if (isNewTagsConflictWithParent) {
                const freeTags = parentTask.tagIds.filter(
                  (ptid) => !newTagIds.includes(ptid),
                );
                const isTagCanBeRemoved = parentTask.projectId || freeTags.length;

                if (isTagCanBeRemoved) {
                  return of(
                    updateTaskTags({
                      task: parentTask,
                      oldTagIds: parentTask.tagIds,
                      newTagIds: freeTags,
                      isSkipExcludeCheck: true,
                    }),
                  );
                } else {
                  this._snackService.open({
                    type: 'ERROR',
                    msg: T.F.TASK.S.LAST_TAG_DELETION_WARNING,
                  });
                  const freeTagsForSub = task.tagIds.filter(
                    (sttid) => !parentTask.tagIds.includes(sttid),
                  );
                  // reverse previous updateTaskTags action since not possible
                  return of(
                    updateTaskTags({
                      task: task,
                      oldTagIds: newTagIds,
                      newTagIds: freeTagsForSub,
                      isSkipExcludeCheck: true,
                    }),
                  );
                }
              }
              return EMPTY;
            }),
          );
        }
        if (task.subTaskIds.length) {
          return this._taskService.getByIdsLive$(task.subTaskIds).pipe(
            first(),
            concatMap((subTasks) => {
              return subTasks
                .filter((subTask) => subTask.tagIds.length)
                .map((subTask) => {
                  return updateTaskTags({
                    task: subTask,
                    oldTagIds: subTask.tagIds,
                    newTagIds: subTask.tagIds.filter((id) => !newTagIds.includes(id)),
                    isSkipExcludeCheck: true,
                  });
                });
            }),
          );
        }

        return EMPTY;
      }),
    ),
  );

  constructor(
    private _actions$: Actions,
    private _reminderService: ReminderService,
    private _taskService: TaskService,
    private _globalConfigService: GlobalConfigService,
    private _persistenceService: PersistenceService,
    private _snackService: SnackService,
  ) {}

  private async _removeFromArchive(task: Task): Promise<unknown> {
    const taskIds = [task.id, ...task.subTaskIds];
    const currentArchive: TaskArchive =
      (await this._persistenceService.taskArchive.loadState()) || createEmptyEntity();
    const allIds = (currentArchive.ids as string[]) || [];
    const idsToRemove: string[] = [];

    taskIds.forEach((taskId) => {
      if (allIds.indexOf(taskId) > -1) {
        delete currentArchive.entities[taskId];
        idsToRemove.push(taskId);
      }
    });

    return this._persistenceService.taskArchive.saveState(
      {
        ...currentArchive,
        ids: allIds.filter((id) => !idsToRemove.includes(id)),
      },
      { isSyncModelChange: true },
    );
  }

  private async _moveToArchive(tasks: TaskWithSubTasks[]): Promise<unknown> {
    const now = Date.now();
    const flatTasks = flattenTasks(tasks);
    if (!flatTasks.length) {
      return;
    }

    const currentArchive: TaskArchive =
      (await this._persistenceService.taskArchive.loadState()) || createEmptyEntity();

    const newArchive = taskAdapter.addMany(
      flatTasks.map(({ subTasks, ...task }) => ({
        ...task,
        reminderId: null,
        isDone: true,
        plannedAt: null,
        doneOn:
          task.isDone && task.doneOn
            ? task.doneOn
            : task.parentId
              ? flatTasks.find((t) => t.id === task.parentId)?.doneOn || now
              : now,
      })),
      currentArchive,
    );

    flatTasks
      .filter((t) => !!t.reminderId)
      .forEach((t) => {
        if (!t.reminderId) {
          throw new Error('No t.reminderId');
        }
        this._reminderService.removeReminder(t.reminderId);
      });

    return this._persistenceService.taskArchive.saveState(newArchive, {
      isSyncModelChange: true,
    });
  }
}
