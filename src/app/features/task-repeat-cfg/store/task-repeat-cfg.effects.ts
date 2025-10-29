import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  concatMap,
  filter,
  first,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {
  addTaskRepeatCfgToTask,
  deleteTaskRepeatCfg,
  updateTaskRepeatCfg,
} from './task-repeat-cfg.actions';
import { Task, TaskCopy } from '../../tasks/task.model';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { TaskService } from '../../tasks/task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg.service';
import { TaskRepeatCfgCopy } from '../task-repeat-cfg.model';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { T } from '../../../t.const';
import { Update } from '@ngrx/entity';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { isToday } from '../../../util/is-today.util';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';
import { Log } from '../../../core/log';
import {
  addSubTask,
  moveSubTask,
  moveSubTaskDown,
  moveSubTaskToBottom,
  moveSubTaskToTop,
  moveSubTaskUp,
} from '../../tasks/store/task.actions';
import { EMPTY, forkJoin, from, Observable, of as rxOf } from 'rxjs';

@Injectable()
export class TaskRepeatCfgEffects {
  private _actions$ = inject(Actions);
  private _taskService = inject(TaskService);
  private _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private _matDialog = inject(MatDialog);
  private _taskArchiveService = inject(TaskArchiveService);

  removeConfigIdFromTaskStateTasks$ = createEffect(() =>
    this._actions$.pipe(
      ofType(deleteTaskRepeatCfg),
      concatMap(({ id }) => this._taskService.getTasksByRepeatCfgId$(id).pipe(take(1))),
      filter((tasks) => tasks && !!tasks.length),
      mergeMap((tasks: Task[]) =>
        tasks.map((task) =>
          TaskSharedActions.updateTask({
            task: {
              id: task.id,
              changes: {
                repeatCfgId: undefined,
              },
            },
          }),
        ),
      ),
    ),
  );

  removeConfigIdFromTaskArchiveTasks$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteTaskRepeatCfg),
        tap(({ id }) => {
          this._taskArchiveService.removeRepeatCfgFromArchiveTasks(id);
        }),
      ),
    { dispatch: false },
  );

  updateTaskAfterMakingItRepeatable$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addTaskRepeatCfgToTask),
        switchMap(({ taskRepeatCfg, taskId }) => {
          return this._taskService.getByIdWithSubTaskData$(taskId).pipe(
            first(),
            map((taskWithSubTasks) => {
              // Extract subtasks safely, ensuring we handle the type properly
              const subTasks = Array.isArray(taskWithSubTasks.subTasks)
                ? taskWithSubTasks.subTasks
                : [];
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { subTasks: _ignored, ...taskWithoutSubs } = taskWithSubTasks;

              if (subTasks.length === 0) {
                return {
                  task: taskWithoutSubs,
                  taskRepeatCfg,
                  subTaskTemplates: [],
                };
              }

              const subTaskTemplates = this._toSubTaskTemplates(subTasks);

              return {
                task: taskWithoutSubs,
                taskRepeatCfg,
                subTaskTemplates,
              };
            }),
          );
        }),
        tap(({ task, taskRepeatCfg, subTaskTemplates }) => {
          this._taskRepeatCfgService.updateTaskRepeatCfg(taskRepeatCfg.id, {
            subTaskTemplates,
          });
          this._updateRegularTaskInstance(task, taskRepeatCfg, taskRepeatCfg);
        }),
      ),
    { dispatch: false },
  );

  /**
   * Auto-syncs subtask templates from the newest live instance when auto-update flag is enabled.
   * Triggers on subtask operations like add, move, update, or delete.
   */
  autoSyncSubtaskTemplatesFromNewest$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addSubTask,
          moveSubTask,
          moveSubTaskUp,
          moveSubTaskDown,
          moveSubTaskToTop,
          moveSubTaskToBottom,
          TaskSharedActions.updateTask,
          TaskSharedActions.deleteTask,
        ),
        // Ignore delete for parent tasks (no need to sync after parent removed)
        filter((action) => this._isRelevantSubtaskAction(action)),
        // Only consider updates relevant to subtasks or parent content updates
        switchMap((action) =>
          this._resolveParentTaskFromAction(action).pipe(
            first(),
            switchMap((parent: Task | null) => {
              if (!parent || !parent.repeatCfgId) {
                return EMPTY;
              }
              const repeatCfgId = parent.repeatCfgId;
              // Load config and verify flags
              return this._taskRepeatCfgService.getTaskRepeatCfgById$(repeatCfgId).pipe(
                first(),
                switchMap((cfg) => {
                  if (!cfg.shouldInheritSubtasks) {
                    return EMPTY;
                  }
                  // auto-update is default unless explicitly disabled
                  const isAutoEnabled = !cfg.disableAutoUpdateSubtasks;
                  if (!isAutoEnabled) {
                    return EMPTY;
                  }
                  // Ensure parent is the newest live instance
                  return this._taskService.getTasksByRepeatCfgId$(repeatCfgId).pipe(
                    first(),
                    switchMap((liveInstances) => {
                      if (!liveInstances || liveInstances.length === 0) {
                        return EMPTY;
                      }
                      const newest = liveInstances.reduce((a, b) =>
                        a.created > b.created ? a : b,
                      );
                      if (newest.id !== parent.id) {
                        return EMPTY;
                      }
                      // Build templates from newest.subTaskIds order
                      return rxOf({
                        cfg,
                        newest,
                      } as {
                        cfg: TaskRepeatCfgCopy;
                        newest: Task;
                      });
                    }),
                  );
                }),
              );
            }),
            filter((res): res is { cfg: TaskRepeatCfgCopy; newest: Task } => !!res),
            switchMap(({ cfg, newest }) =>
              this._taskService.getByIdsLive$(newest.subTaskIds).pipe(
                first(),
                map((subs) => ({ cfg, newest, subs })),
              ),
            ),
            mergeMap(({ cfg, subs }) => {
              const newTemplates = this._toSubTaskTemplates(subs || []);
              if (this._templatesEqual(cfg.subTaskTemplates, newTemplates)) {
                return EMPTY;
              }
              return rxOf(
                updateTaskRepeatCfg({
                  taskRepeatCfg: {
                    id: cfg.id as string,
                    changes: { subTaskTemplates: newTemplates },
                  },
                  isAskToUpdateAllTaskInstances: false,
                }),
              );
            }),
            filter((v): v is ReturnType<typeof updateTaskRepeatCfg> => !!v),
          ),
        ),
      ),
    { dispatch: true },
  );

  /**
   * When enabling inherit subtasks in the dialog, immediately snapshots the subtasks
   * from the newest instance to set initial templates.
   */
  enableAutoUpdateOrInheritSnapshot$ = createEffect(() =>
    this._actions$.pipe(
      ofType(updateTaskRepeatCfg),
      // only react to enabling inherit subtasks; avoids loops
      // Note: this snapshots current subtasks when inherit is enabled, regardless of auto-update flag
      filter(({ taskRepeatCfg }) => {
        const ch = taskRepeatCfg.changes as Partial<TaskRepeatCfgCopy>;
        return ch.shouldInheritSubtasks === true;
      }),
      switchMap(({ taskRepeatCfg }) =>
        this._taskRepeatCfgService.getTaskRepeatCfgById$(taskRepeatCfg.id as string).pipe(
          first(),
          switchMap((cfg) => {
            const ch = taskRepeatCfg.changes as Partial<TaskRepeatCfgCopy>;
            const shouldInherit =
              ch.shouldInheritSubtasks !== undefined
                ? ch.shouldInheritSubtasks
                : cfg.shouldInheritSubtasks;
            if (!shouldInherit) {
              return EMPTY;
            }
            // Snapshot regardless of auto-update flag to set initial templates

            const repeatCfgId = taskRepeatCfg.id as string;
            // Try newest live first
            return this._taskService.getTasksByRepeatCfgId$(repeatCfgId).pipe(
              first(),
              switchMap((liveInstances) => {
                let newestLive: Task | null = null;
                if (liveInstances && liveInstances.length) {
                  newestLive = liveInstances.reduce((a, b) =>
                    a.created > b.created ? a : b,
                  );
                }

                if (newestLive) {
                  return this._taskService.getByIdsLive$(newestLive.subTaskIds).pipe(
                    first(),
                    map((subs) => ({ cfg, subs })),
                  );
                }

                // fallback to archive
                return from(
                  this._taskService.getArchiveTasksForRepeatCfgId(repeatCfgId),
                ).pipe(
                  switchMap((arch) => {
                    if (!arch || arch.length === 0) {
                      return rxOf({ cfg, subs: [] as Task[] });
                    }
                    const newest = arch.reduce((a, b) => (a.created > b.created ? a : b));
                    return from(this._taskArchiveService.load()).pipe(
                      map((archiveState) => {
                        const subs = newest.subTaskIds
                          .map((id) => archiveState.entities[id])
                          .filter(Boolean) as unknown as Task[];
                        return { cfg, subs };
                      }),
                    );
                  }),
                );
              }),
              mergeMap(({ cfg: config, subs }) => {
                const newTemplates = this._toSubTaskTemplates(subs || []);
                if (this._templatesEqual(config.subTaskTemplates, newTemplates)) {
                  return EMPTY;
                }
                return rxOf(
                  updateTaskRepeatCfg({
                    taskRepeatCfg: {
                      id: config.id as string,
                      changes: { subTaskTemplates: newTemplates },
                    },
                    isAskToUpdateAllTaskInstances: false,
                  }),
                );
              }),
              filter((v): v is ReturnType<typeof updateTaskRepeatCfg> => !!v),
            );
          }),
        ),
      ),
    ),
  );

  // Update startDate when a task with repeatOnComplete is marked as done
  updateStartDateOnComplete$ = createEffect(() =>
    this._actions$.pipe(
      ofType(TaskSharedActions.updateTask),
      filter((a) => a.task.changes.isDone === true),
      switchMap(({ task }) =>
        this._taskService
          .getByIdOnce$(task.id as string)
          .pipe(map((fullTask) => fullTask)),
      ),
      filter((task) => !!task.repeatCfgId),
      switchMap((task) =>
        this._taskRepeatCfgService.getTaskRepeatCfgById$(task.repeatCfgId as string).pipe(
          take(1),
          map((cfg) => ({ task, cfg })),
        ),
      ),
      filter(({ cfg }) => !!cfg && cfg.repeatFromCompletionDate === true),
      map(({ cfg }) => {
        const today = getDbDateStr();
        return updateTaskRepeatCfg({
          taskRepeatCfg: {
            id: cfg.id as string,
            changes: {
              startDate: today,
              lastTaskCreationDay: today,
            },
          },
        });
      }),
    ),
  );

  checkToUpdateAllTaskInstances$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTaskRepeatCfg),
        filter(({ isAskToUpdateAllTaskInstances }) => !!isAskToUpdateAllTaskInstances),
        concatMap(({ taskRepeatCfg }) => {
          const id = taskRepeatCfg.id as string;
          return forkJoin([
            rxOf(taskRepeatCfg),
            this._taskService.getTasksByRepeatCfgId$(id).pipe(first()),
            this._taskService.getArchiveTasksForRepeatCfgId(id),
          ]);
        }),
        concatMap(([{ id, changes }, todayTasks, archiveTasks]) => {
          if (todayTasks.length + archiveTasks.length === 0) {
            return rxOf(false);
          }
          // NOTE: there will always be at least on instance, since we're editing it
          return this._matDialog
            .open(DialogConfirmComponent, {
              restoreFocus: true,
              data: {
                okTxt: T.F.TASK_REPEAT.D_CONFIRM_UPDATE_INSTANCES.OK,
                cancelTxt: T.F.TASK_REPEAT.D_CONFIRM_UPDATE_INSTANCES.CANCEL,
                message: T.F.TASK_REPEAT.D_CONFIRM_UPDATE_INSTANCES.MSG,
                translateParams: { tasksNr: todayTasks.length + archiveTasks.length },
              },
            })
            .afterClosed()
            .pipe(
              withLatestFrom(
                this._taskRepeatCfgService.getTaskRepeatCfgById$(id as string),
              ),
              tap(([isConfirm, completeCfg]) => {
                if (isConfirm) {
                  Log.log(changes);
                  Log.log(todayTasks, archiveTasks);
                  // NOTE: keep in mind that it's very likely that there will be only one task for today
                  // TODO update reminders if given
                  todayTasks.forEach((task) =>
                    this._updateRegularTaskInstance(task, changes, completeCfg),
                  );

                  const archiveUpdates: Update<TaskCopy>[] = archiveTasks.map((task) => {
                    const changesForArchiveTask: Partial<TaskCopy> = {};
                    // NOTE: projects can't be updated from the dialog
                    // if (
                    //   typeof changes.projectId === 'string' &&
                    //   task.projectId !== changes.projectId
                    // ) {
                    //   changesForArchiveTask.projectId = changes.projectId;
                    //   // TODO also update sub tasks
                    //   if (task.subTaskIds) {
                    //     task.subTaskIds.forEach((subTaskId) => {
                    //       this._taskService.updateArchiveTask(
                    //         subTaskId,
                    //         changesForArchiveTask,
                    //       );
                    //     });
                    //   }
                    // }
                    if (changes.tagIds) {
                      changesForArchiveTask.tagIds = changes.tagIds;
                    }
                    if (changes.title) {
                      changesForArchiveTask.title = changes.title;
                    }
                    if (changes.notes) {
                      changesForArchiveTask.notes = changes.notes;
                    }
                    if (
                      typeof changes.defaultEstimate === 'number' &&
                      task.subTaskIds.length === 0
                    ) {
                      changesForArchiveTask.timeEstimate = changes.defaultEstimate;
                    }
                    Log.log('updateArchiveTask', changesForArchiveTask);
                    return { id: task.id, changes: changesForArchiveTask };
                  });
                  this._taskService.updateArchiveTasks(archiveUpdates);
                }
              }),
            );
        }),
      ),
    { dispatch: false },
  );

  private _updateRegularTaskInstance(
    task: TaskCopy,
    changes: Partial<TaskRepeatCfgCopy>,
    completeCfg: TaskRepeatCfgCopy,
  ): void {
    // NOTE: projects can't be updated from the dialog,
    // if (
    //   typeof changes.projectId === 'string' &&
    //   task.projectId !== changes.projectId
    // ) {
    //   const withSubTasks = await this._taskService
    //     .getByIdWithSubTaskData$(task.id)
    //     .pipe(take(1))
    //     .toPromise();
    //   this._taskService.moveToProject(withSubTasks, changes.projectId);
    // }
    if (
      (changes.startTime || changes.remindAt) &&
      completeCfg.remindAt &&
      completeCfg.startTime &&
      isToday(task.created)
    ) {
      const dateTime = getDateTimeFromClockString(
        completeCfg.startTime as string,
        new Date(),
      );
      if (task.reminderId) {
        this._taskService.reScheduleTask({
          task,
          due: dateTime,
          remindCfg: completeCfg.remindAt,
          isMoveToBacklog: false,
        });
      } else {
        this._taskService.scheduleTask(task, dateTime, completeCfg.remindAt);
      }
    }
    if (changes.tagIds) {
      this._taskService.updateTags(task, changes.tagIds);
    }
    if (changes.title || changes.notes) {
      this._taskService.update(task.id, {
        ...(changes.title
          ? {
              title: changes.title,
            }
          : {}),
        ...(changes.notes
          ? {
              notes: changes.notes,
            }
          : {}),
      });
    }
    if (typeof changes.defaultEstimate === 'number' && task.subTaskIds.length === 0) {
      this._taskService.update(task.id, {
        timeEstimate: changes.defaultEstimate,
      });
    }
  }

  private _templatesEqual(
    a: TaskRepeatCfgCopy['subTaskTemplates'] | undefined,
    b: NonNullable<TaskRepeatCfgCopy['subTaskTemplates']>,
  ): boolean {
    const aArr = a || [];
    if (aArr.length !== b.length) {
      return false;
    }
    for (let i = 0; i < aArr.length; i++) {
      const ai = aArr[i];
      const bi = b[i];
      if (
        ai.title !== bi.title ||
        (ai.notes || '') !== (bi.notes || '') ||
        (ai.timeEstimate || 0) !== (bi.timeEstimate || 0)
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Determines if an action is relevant for subtask template syncing
   */
  private _isRelevantSubtaskAction(action: any): boolean {
    if (action.type === TaskSharedActions.deleteTask.type) {
      const task = action.task as Task | undefined;
      return !!task && !!task.parentId;
    }
    return true;
  }

  /**
   * Resolves the parent task from an action that might affect subtasks
   */
  private _resolveParentTaskFromAction(action: any): Observable<Task | null> {
    const parentId: string | undefined = action.parentId || action.srcTaskId;
    const updatedTaskId: string | undefined = action.task?.id || action.id;

    if (!parentId && !updatedTaskId) {
      return EMPTY;
    }

    // Resolve the parent: if parentId given use it, else try to get parent via updated task
    const resolveParent$ = parentId
      ? this._taskService.getByIdOnce$(parentId)
      : updatedTaskId
        ? this._taskService
            .getByIdOnce$(updatedTaskId as string)
            .pipe(
              switchMap((t) =>
                t && t.parentId ? this._taskService.getByIdOnce$(t.parentId) : rxOf(null),
              ),
            )
        : rxOf(null);

    return resolveParent$;
  }

  /**
   * Converts tasks to subtask templates with only essential fields
   */
  private _toSubTaskTemplates(
    subs: Task[],
  ): NonNullable<TaskRepeatCfgCopy['subTaskTemplates']> {
    return subs.map((st) => ({
      title: st.title,
      notes: st.notes,
      timeEstimate: st.timeEstimate,
    }));
  }
}
