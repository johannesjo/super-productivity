import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addTask,
  addTimeSpent,
  moveToArchive,
  moveToOtherProject,
  restoreTask,
  scheduleTask,
  updateTask,
  updateTaskTags,
} from './task.actions';
import {
  concatMap,
  filter,
  map,
  mapTo,
  mergeMap,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { Task, TaskArchive, TaskReminderOptionId, TaskWithSubTasks } from '../task.model';
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
import { ProjectService } from '../../project/project.service';
import { TagService } from '../../tag/tag.service';
import { shortSyntax } from '../short-syntax.util';
import { remindOptionToMilliseconds } from '../util/remind-option-to-milliseconds';
import { environment } from '../../../../environments/environment';
import { moveProjectTaskToTodayList } from '../../project/store/project.actions';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from '../../../t.const';

@Injectable()
export class TaskRelatedModelEffects {
  // EFFECTS ===> EXTERNAL
  // ---------------------

  moveToArchive$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(moveToArchive),
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
          task.parentId ? this._taskService.getByIdOnce$(task.parentId) : of(task),
        ),
        filter((task: Task) => !task.tagIds.includes(TODAY_TAG.id)),
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

  shortSyntax$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addTask, updateTask),
      filter((action): boolean => {
        if (action.type !== updateTask.type) {
          return true;
        }
        const changeProps = Object.keys(action.task.changes);
        // we only want to execute this for task title updates
        return changeProps.length === 1 && changeProps[0] === 'title';
      }),
      // dirty fix to execute this after setDefaultProjectId$ effect
      concatMap((originalAction): Observable<any> => {
        return this._taskService.getByIdOnce$(originalAction.task.id as string).pipe(
          map((task) => ({
            task,
            originalAction,
          })),
        );
      }),
      withLatestFrom(
        this._tagService.tags$,
        this._projectService.list$,
        this._globalConfigService.misc$.pipe(
          map((misc) => misc.defaultProjectId),
          concatMap((defaultProjectId) =>
            defaultProjectId
              ? this._projectService.getByIdOnce$(defaultProjectId).pipe(
                  tap((project) => {
                    if (!project) {
                      // to avoid further data inconsistencies
                      throw new Error('Default Project not found');
                    }
                  }),
                  mapTo(defaultProjectId),
                )
              : of(defaultProjectId),
          ),
        ),
      ),
      mergeMap(([{ task, originalAction }, tags, projects, defaultProjectId]) => {
        const r = shortSyntax(task, tags, projects);
        if (environment.production) {
          console.log('shortSyntax', r);
        }
        const isAddDefaultProjectIfNecessary: boolean =
          !!defaultProjectId &&
          !task.projectId &&
          !task.parentId &&
          task.projectId !== defaultProjectId &&
          originalAction.type === addTask.type;

        if (!r) {
          if (isAddDefaultProjectIfNecessary) {
            return [
              moveToOtherProject({
                task,
                targetProjectId: defaultProjectId as string,
              }),
            ];
          }
          return EMPTY;
        }

        const actions: any[] = [];
        const tagIds: string[] = [...(r.taskChanges.tagIds || task.tagIds)];
        const { taskChanges } = r;

        actions.push(
          updateTask({
            task: {
              id: task.id,
              changes: r.taskChanges,
            },
          }),
        );
        if (taskChanges.plannedAt && !taskChanges.reminderId) {
          const { plannedAt } = taskChanges;
          const schedule = scheduleTask({
            task,
            plannedAt,
            remindAt: remindOptionToMilliseconds(plannedAt, TaskReminderOptionId.AtStart),
            isMoveToBacklog: false,
          });
          actions.push(schedule);
        }
        if (r.projectId && r.projectId !== task.projectId && !task.parentId) {
          if (task.repeatCfgId) {
            this._snackService.open({
              ico: 'warning',
              msg: T.F.TASK.S.CANNOT_ASSIGN_PROJECT_FOR_REPEATABLE_TASK,
            });
          } else {
            actions.push(
              moveToOtherProject({
                task,
                targetProjectId: r.projectId,
              }),
            );
          }
        } else if (isAddDefaultProjectIfNecessary) {
          actions.push(
            moveToOtherProject({
              task,
              targetProjectId: defaultProjectId as string,
            }),
          );
        }

        if (r.newTagTitles.length) {
          r.newTagTitles.forEach((newTagTitle) => {
            const { action, id } = this._tagService.getAddTagActionAndId({
              title: newTagTitle,
            });
            tagIds.push(id);
            actions.push(action);
          });
        }

        if (tagIds && tagIds.length) {
          const isEqualTags = JSON.stringify(tagIds) === JSON.stringify(task.tagIds);
          if (!task.tagIds) {
            throw new Error('Task Old TagIds need to be passed');
          }
          if (!isEqualTags) {
            actions.push(
              updateTaskTags({
                task,
                newTagIds: unique(tagIds),
                oldTagIds: task.tagIds,
              }),
            );
          }
        }

        return actions;
      }),
    ),
  );

  constructor(
    private _actions$: Actions,
    private _reminderService: ReminderService,
    private _taskService: TaskService,
    private _tagService: TagService,
    private _projectService: ProjectService,
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
