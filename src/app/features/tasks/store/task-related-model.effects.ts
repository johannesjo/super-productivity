import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addTimeSpent,
  moveToArchive_,
  restoreTask,
  updateTask,
  updateTaskTags,
} from './task.actions';
import { concatMap, filter, first, map, switchMap, tap } from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { Task, TaskArchive, TaskCopy, TaskWithSubTasks } from '../task.model';
import { ReminderService } from '../../reminder/reminder.service';
import { moveTaskInTodayList } from '../../work-context/store/work-context-meta.actions';
import { taskAdapter } from './task.adapter';
import { flattenTasks } from './task.selectors';
import { GlobalConfigService } from '../../config/global-config.service';
import { TODAY_TAG } from '../../tag/tag.const';
import { unique } from '../../../util/unique';
import { TaskService } from '../task.service';
import { EMPTY, Observable, of } from 'rxjs';
import { createEmptyEntity } from '../../../util/create-empty-entity';
import { moveProjectTaskToRegularList } from '../../project/store/project.actions';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from '../../../t.const';

@Injectable()
export class TaskRelatedModelEffects {
  private _actions$ = inject(Actions);
  private _reminderService = inject(ReminderService);
  private _taskService = inject(TaskService);
  private _globalConfigService = inject(GlobalConfigService);
  private _persistenceService = inject(PersistenceService);
  private _snackService = inject(SnackService);

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
          }),
        ),
      ),
    ),
  );

  // EXTERNAL ===> TASKS
  // -------------------

  moveTaskToUnDone$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(moveTaskInTodayList, moveProjectTaskToRegularList),
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
      ofType(moveTaskInTodayList, moveProjectTaskToRegularList),
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

  excludeNewTagsFromParentOrChildren$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(updateTaskTags),
      filter(({ isSkipExcludeCheck }) => !isSkipExcludeCheck),
      switchMap(({ task, newTagIds }) => {
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
                      task: {
                        ...task,
                        tagIds: newTagIds,
                      },
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
        reminderId: undefined,
        isDone: true,
        plannedAt: undefined,
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
