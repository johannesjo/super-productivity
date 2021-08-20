import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addTask,
  addTimeSpent,
  moveToArchive,
  moveToOtherProject,
  restoreTask,
  updateTask,
  updateTaskTags,
} from './task.actions';
import {
  concatMap,
  delay,
  filter,
  first,
  map,
  mapTo,
  mergeMap,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { Task, TaskArchive, TaskWithSubTasks } from '../task.model';
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
import { environment } from '../../../../environments/environment';
import { moveProjectTaskToTodayList } from '../../project/store/project.actions';

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

  // TODO remove once reminder is changed

  moveToOtherProject: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(moveToOtherProject),
        tap(({ task, targetProjectId }) =>
          this._moveToOtherProject(task, targetProjectId),
        ),
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

  autoAddTodayTag: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addTimeSpent),
      switchMap(({ task }) =>
        task.parentId ? this._taskService.getByIdOnce$(task.parentId) : of(task),
      ),
      filter((task: Task) => !task.tagIds.includes(TODAY_TAG.id)),
      concatMap((task: Task) =>
        this._globalConfigService.misc$.pipe(
          first(),
          map((miscCfg) => ({
            miscCfg,
            task,
          })),
        ),
      ),
      filter(({ miscCfg, task }) => miscCfg.isAutoAddWorkedOnToToday),
      map(({ miscCfg, task }) =>
        updateTaskTags({
          task,
          newTagIds: unique([...task.tagIds, TODAY_TAG.id]),
          oldTagIds: task.tagIds,
        }),
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

  setDefaultProjectId$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addTask),
      concatMap(({ task }) =>
        this._globalConfigService.misc$.pipe(
          first(),
          // error handling
          switchMap((miscConfig) =>
            !!miscConfig.defaultProjectId
              ? this._projectService.getByIdOnce$(miscConfig.defaultProjectId).pipe(
                  tap((project) => {
                    if (!project) {
                      throw new Error('Default Project not found');
                    }
                  }),
                  mapTo(miscConfig),
                )
              : of(miscConfig),
          ),
          // error handling end
          map((miscCfg) => ({
            defaultProjectId: miscCfg.defaultProjectId,
            task,
          })),
        ),
      ),
      filter(
        ({ defaultProjectId, task }) =>
          !!defaultProjectId && !task.projectId && !task.parentId,
      ),
      map(({ task, defaultProjectId }) =>
        moveToOtherProject({
          task: task as TaskWithSubTasks,
          targetProjectId: defaultProjectId as string,
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
      delay(20),
      concatMap((action): Observable<any> => {
        return this._taskService.getByIdOnce$(action.task.id as string);
      }),
      withLatestFrom(this._tagService.tags$, this._projectService.list$),
      mergeMap(([task, tags, projects]) => {
        const r = shortSyntax(task, tags, projects);
        if (environment.production) {
          console.log('shortSyntax', r);
        }
        if (!r) {
          return EMPTY;
        }

        const actions: any[] = [];
        const tagIds: string[] = [...(r.taskChanges.tagIds || task.tagIds)];

        actions.push(
          updateTask({
            task: {
              id: task.id,
              changes: r.taskChanges,
            },
          }),
        );
        if (r.projectId && r.projectId !== task.projectId) {
          actions.push(
            moveToOtherProject({
              task,
              targetProjectId: r.projectId,
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

  private _moveToOtherProject(
    mainTasks: TaskWithSubTasks,
    targetProjectId: string,
  ): void {
    const workContextId = targetProjectId;

    if (mainTasks.reminderId) {
      this._reminderService.updateReminder(mainTasks.reminderId, { workContextId });
    }

    if (mainTasks.subTasks) {
      mainTasks.subTasks.forEach((subTask) => {
        if (subTask.reminderId) {
          this._reminderService.updateReminder(subTask.reminderId, { workContextId });
        }
      });
    }
  }
}
