import { nanoid } from 'nanoid';
import { first, map, take, withLatestFrom } from 'rxjs/operators';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ArchiveTask,
  DEFAULT_TASK,
  DropListModelSource,
  HideSubTasksMode,
  Task,
  TaskArchive,
  TaskCopy,
  TaskDetailTargetPanel,
  TaskReminderOptionId,
  TaskState,
  TaskWithSubTasks,
} from './task.model';
import { select, Store } from '@ngrx/store';
import {
  addSubTask,
  moveSubTask,
  moveSubTaskDown,
  moveSubTaskToBottom,
  moveSubTaskToTop,
  moveSubTaskUp,
  removeTimeSpent,
  roundTimeSpentForDay,
  setCurrentTask,
  setSelectedTask,
  toggleStart,
  toggleTaskHideSubTasks,
  unsetCurrentTask,
  updateTaskUi,
} from './store/task.actions';
import { IssueProviderKey } from '../issue/issue.model';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import {
  selectAllTasks,
  selectCurrentTask,
  selectCurrentTaskId,
  selectCurrentTaskOrParentWithData,
  selectCurrentTaskParentOrCurrent,
  selectIsTaskDataLoaded,
  selectMainTasksWithoutTag,
  selectSelectedTask,
  selectSelectedTaskId,
  selectStartableTasks,
  selectTaskById,
  selectTaskByIdWithSubTaskData,
  selectTaskDetailTargetPanel,
  selectTaskFeatureState,
  selectTasksById,
  selectTasksByRepeatConfigId,
  selectTasksByTag,
  selectTaskWithSubTasksByRepeatConfigId,
} from './store/task.selectors';
import { RoundTimeOption } from '../project/project.model';
import { WorkContextService } from '../work-context/work-context.service';
import { WorkContextType } from '../work-context/work-context.model';
import {
  moveTaskDownInTodayList,
  moveTaskInTodayList,
  moveTaskToBottomInTodayList,
  moveTaskToTopInTodayList,
  moveTaskUpInTodayList,
} from '../work-context/store/work-context-meta.actions';
import { Router } from '@angular/router';
import { unique } from '../../util/unique';
import { ImexViewService } from '../../imex/imex-meta/imex-view.service';
import { remindOptionToMilliseconds } from './util/remind-option-to-milliseconds';
import {
  moveProjectTaskDownInBacklogList,
  moveProjectTaskInBacklogList,
  moveProjectTaskToBacklogList,
  moveProjectTaskToBottomInBacklogList,
  moveProjectTaskToRegularList,
  moveProjectTaskToTopInBacklogList,
  moveProjectTaskUpInBacklogList,
} from '../project/store/project.actions';
import { Update } from '@ngrx/entity';
import { DateService } from '../../core/date/date.service';
import { TimeTrackingActions } from '../time-tracking/store/time-tracking.actions';
import { ArchiveService } from '../time-tracking/archive.service';
import { TaskArchiveService } from '../time-tracking/task-archive.service';
import { TODAY_TAG } from '../tag/tag.const';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { getWorklogStr } from '../../util/get-work-log-str';
import { INBOX_PROJECT } from '../project/project.const';
import { GlobalConfigService } from '../config/global-config.service';
import { TaskLog } from '../../core/log';
import { devError } from '../../util/dev-error';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly _store = inject<Store<any>>(Store);
  private readonly _workContextService = inject(WorkContextService);
  private readonly _imexMetaService = inject(ImexViewService);
  private readonly _timeTrackingService = inject(GlobalTrackingIntervalService);
  private readonly _dateService = inject(DateService);
  private readonly _router = inject(Router);
  private readonly _archiveService = inject(ArchiveService);
  private readonly _taskArchiveService = inject(TaskArchiveService);
  private readonly _globalConfigService = inject(GlobalConfigService);

  // Currently used in idle service TODO remove
  currentTaskId: string | null = null;
  currentTaskId$: Observable<string | null> = this._store.pipe(
    select(selectCurrentTaskId),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  currentTask$: Observable<Task | null> = this._store.pipe(
    select(selectCurrentTask),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  currentTaskParentOrCurrent$: Observable<Task> = this._store.pipe(
    select(selectCurrentTaskParentOrCurrent),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  selectedTaskId$: Observable<string | null> = this._store.pipe(
    select(selectSelectedTaskId),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  selectedTask$: Observable<TaskWithSubTasks | null> = this._store.pipe(
    select(selectSelectedTask),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  firstStartableTask$: Observable<Task | undefined> =
    this._workContextService.startableTasksForActiveContext$.pipe(
      map((tasks) => tasks[0]),
    );

  taskDetailPanelTargetPanel$: Observable<TaskDetailTargetPanel | null | undefined> =
    this._store.pipe(
      select(selectTaskDetailTargetPanel),
      // NOTE: we can't use share here, as we need the last emitted value
    );

  currentTaskOrCurrentParent$: Observable<TaskWithSubTasks | null> = this._store.pipe(
    select(selectCurrentTaskOrParentWithData),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  isTaskDataLoaded$: Observable<boolean> = this._store.pipe(
    select(selectIsTaskDataLoaded),
  );

  taskFeatureState$: Observable<TaskState> = this._store.pipe(
    select(selectTaskFeatureState),
  );

  allTasks$: Observable<Task[]> = this._store.pipe(select(selectAllTasks));

  allStartableTasks$: Observable<Task[]> = this._store.pipe(select(selectStartableTasks));

  // META FIELDS
  // -----------
  currentTaskProgress$: Observable<number> = this.currentTask$.pipe(
    map((task) =>
      task && task.timeEstimate > 0 ? task.timeSpent / task.timeEstimate : 0,
    ),
  );

  private _lastFocusedTaskEl: HTMLElement | null = null;
  private _allTasks$: Observable<Task[]> = this._store.pipe(select(selectAllTasks));

  constructor() {
    document.addEventListener(
      'focus',
      (ev) => {
        if (
          ev.target &&
          ev.target instanceof HTMLElement &&
          ev.target.tagName.toLowerCase() === 'task'
        ) {
          this._lastFocusedTaskEl = ev.target;
        }
      },
      true,
    );

    this.currentTaskId$.subscribe((val) => (this.currentTaskId = val));

    // time tracking
    this._timeTrackingService.tick$
      .pipe(
        withLatestFrom(this.currentTask$, this._imexMetaService.isDataImportInProgress$),
      )
      .subscribe(([tick, currentTask, isImportInProgress]) => {
        if (currentTask && !isImportInProgress) {
          this.addTimeSpent(currentTask, tick.duration, tick.date);
        }
      });
  }

  getAllParentWithoutTag$(tagId: string): Observable<Task[]> {
    return this._store.pipe(select(selectMainTasksWithoutTag, { tagId }));
  }

  // META

  // ----
  setCurrentId(id: string | null): void {
    if (id) {
      this._store.dispatch(setCurrentTask({ id }));
    } else {
      this._store.dispatch(unsetCurrentTask());
    }
  }

  setSelectedId(
    id: string | null,
    taskDetailTargetPanel: TaskDetailTargetPanel = TaskDetailTargetPanel.Default,
  ): void {
    this._store.dispatch(setSelectedTask({ id, taskDetailTargetPanel }));
  }

  async setSelectedIdToParentAndSwitchContextIfNecessary(task: TaskCopy): Promise<void> {
    if (!task.parentId) {
      throw new Error('No task with parent task given');
    }
    const parentTask = await this.getByIdOnce$(task.parentId).toPromise();
    const { activeId, activeType } =
      await this._workContextService.activeWorkContextTypeAndId$
        .pipe(first())
        .toPromise();

    const isParentOnSameList =
      activeType === WorkContextType.PROJECT
        ? parentTask.projectId === activeId
        : parentTask.tagIds.includes(activeId);

    if (!isParentOnSameList) {
      if (parentTask.projectId) {
        await this._router.navigate([`project/${parentTask.projectId}/tasks`]);
      } else if (parentTask.tagIds[0]) {
        await this._router.navigate([`tag/${parentTask.tagIds[0]}/tasks`]);
      } else {
        throw new Error('No valid context found for parent task');
      }
    }

    this._store.dispatch(
      setSelectedTask({
        id: task.parentId,
        taskDetailTargetPanel: TaskDetailTargetPanel.Default,
      }),
    );
  }

  startFirstStartable(): void {
    this._workContextService.startableTasksForActiveContext$
      .pipe(take(1))
      .subscribe((tasks) => {
        if (tasks[0] && !this.currentTaskId) {
          this.setCurrentId(tasks[0].id);
        }
      });
  }

  pauseCurrent(): void {
    this._store.dispatch(unsetCurrentTask());
  }

  // Tasks
  // -----
  add(
    title: string | null,
    isAddToBacklog: boolean = false,
    additional: Partial<Task> = {},
    isAddToBottom: boolean = false,
  ): string {
    const workContextId = this._workContextService.activeWorkContextId as string;
    const workContextType = this._workContextService
      .activeWorkContextType as WorkContextType;
    const task = this.createNewTaskWithDefaults({
      title,
      additional,
      workContextType,
      workContextId,
    });

    TaskLog.log(task, additional);

    this._store.dispatch(
      TaskSharedActions.addTask({
        task,
        workContextId,
        workContextType,
        isAddToBacklog,
        isAddToBottom,
      }),
    );
    return task && task.id;
  }

  async addAndSchedule(
    title: string | null,
    additional: Partial<Task> = {},
    due: number,
    remindCfg: TaskReminderOptionId = TaskReminderOptionId.AtStart,
  ): Promise<string> {
    const id = this.add(title, undefined, additional, undefined);
    const task = await this.getByIdOnce$(id).toPromise();
    this.scheduleTask(task, due, remindCfg);
    return id;
  }

  remove(task: TaskWithSubTasks): void {
    this._store.dispatch(TaskSharedActions.deleteTask({ task }));
  }

  removeMultipleTasks(taskIds: string[]): void {
    this._store.dispatch(TaskSharedActions.deleteTasks({ taskIds }));
  }

  update(id: string, changedFields: Partial<Task>): void {
    this._store.dispatch(
      TaskSharedActions.updateTask({
        task: { id, changes: changedFields },
      }),
    );
  }

  updateTags(task: Task, newTagIds: string[]): void {
    this._store.dispatch(
      TaskSharedActions.updateTask({
        task: {
          id: task.id,
          changes: {
            tagIds: unique(newTagIds),
          },
        },
      }),
    );
  }

  removeTagsForAllTask(tagsToRemove: string[]): void {
    this._store.dispatch(
      TaskSharedActions.removeTagsForAllTasks({
        tagIdsToRemove: tagsToRemove,
      }),
    );
  }

  updateUi(id: string, changes: Partial<Task>): void {
    this._store.dispatch(
      updateTaskUi({
        task: { id, changes },
      }),
    );
  }

  move(
    taskId: string,
    src: DropListModelSource,
    target: DropListModelSource,
    newOrderedIds: string[],
  ): void {
    const isSrcTodayList = src === 'DONE' || src === 'UNDONE';
    const isTargetTodayList = target === 'DONE' || target === 'UNDONE';
    const workContextId = this._workContextService.activeWorkContextId as string;

    if (isSrcTodayList && isTargetTodayList) {
      // move inside today
      const workContextType = this._workContextService
        .activeWorkContextType as WorkContextType;
      this._store.dispatch(
        moveTaskInTodayList({
          taskId,
          newOrderedIds,
          src,
          target,
          workContextId,
          workContextType,
        }),
      );
    } else if (src === 'BACKLOG' && target === 'BACKLOG') {
      // move inside backlog
      this._store.dispatch(
        moveProjectTaskInBacklogList({ taskId, newOrderedIds, workContextId }),
      );
    } else if (src === 'BACKLOG' && isTargetTodayList) {
      // move from backlog to today
      this._store.dispatch(
        moveProjectTaskToRegularList({
          taskId,
          newOrderedIds,
          src,
          target,
          workContextId,
        }),
      );
    } else if (isSrcTodayList && target === 'BACKLOG') {
      // move from today to backlog
      this._store.dispatch(
        moveProjectTaskToBacklogList({ taskId, newOrderedIds, workContextId }),
      );
    } else {
      // move sub task
      this._store.dispatch(
        moveSubTask({ taskId, srcTaskId: src, targetTaskId: target, newOrderedIds }),
      );
    }
  }

  async moveUp(
    id: string,
    parentId: string | null = null,
    isBacklog: boolean,
  ): Promise<void> {
    const allMainTaskIds = [
      ...(await this._workContextService.todaysTaskIds$.pipe(first()).toPromise()),
      ...(await this._workContextService.backlogTaskIds$.pipe(first()).toPromise()),
    ];
    const isSubTaskAsMain = parentId && allMainTaskIds.includes(id);

    if (parentId && !isSubTaskAsMain) {
      const parentTask = await this.getByIdOnce$(parentId).toPromise();
      if (parentTask.subTaskIds[0] === id) {
        return await this.moveUp(parentId, undefined, false);
      } else {
        this._store.dispatch(moveSubTaskUp({ id, parentId }));
      }
    } else {
      const workContextId = this._workContextService.activeWorkContextId as string;
      const workContextType = this._workContextService
        .activeWorkContextType as WorkContextType;

      if (isBacklog) {
        const doneBacklogTaskIds = await this._workContextService.doneBacklogTaskIds$
          .pipe(take(1))
          .toPromise();
        if (!doneBacklogTaskIds) {
          throw new Error('No doneBacklogTaskIds found');
        }
        this._store.dispatch(
          moveProjectTaskUpInBacklogList({
            taskId: id,
            workContextId,
            doneBacklogTaskIds,
          }),
        );
      } else {
        const doneTaskIds = await this._workContextService.doneTaskIds$
          .pipe(take(1))
          .toPromise();
        this._store.dispatch(
          moveTaskUpInTodayList({
            taskId: id,
            workContextType,
            workContextId,
            doneTaskIds,
          }),
        );
      }
    }
  }

  async moveDown(
    id: string,
    parentId: string | null = null,
    isBacklog: boolean,
  ): Promise<void> {
    const allMainTaskIds = [
      ...(await this._workContextService.todaysTaskIds$.pipe(first()).toPromise()),
      ...(await this._workContextService.backlogTaskIds$.pipe(first()).toPromise()),
    ];
    const isSubTaskAsMain = parentId && allMainTaskIds.includes(id);

    if (parentId && !isSubTaskAsMain) {
      const parentTask = await this.getByIdOnce$(parentId).toPromise();
      if (parentTask.subTaskIds[parentTask.subTaskIds.length - 1] === id) {
        return await this.moveDown(parentId, undefined, false);
      } else {
        this._store.dispatch(moveSubTaskDown({ id, parentId }));
      }
    } else {
      const workContextId = this._workContextService.activeWorkContextId as string;
      const workContextType = this._workContextService
        .activeWorkContextType as WorkContextType;

      // this.
      if (isBacklog) {
        const doneBacklogTaskIds = await this._workContextService.doneBacklogTaskIds$
          .pipe(take(1))
          .toPromise();
        if (!doneBacklogTaskIds) {
          throw new Error('No doneBacklogTaskIds found');
        }
        this._store.dispatch(
          moveProjectTaskDownInBacklogList({
            taskId: id,
            workContextId,
            doneBacklogTaskIds,
          }),
        );
      } else {
        const doneTaskIds = await this._workContextService.doneTaskIds$
          .pipe(take(1))
          .toPromise();
        this._store.dispatch(
          moveTaskDownInTodayList({
            taskId: id,
            workContextType,
            workContextId,
            doneTaskIds,
          }),
        );
      }
    }
  }

  moveToTop(id: string, parentId: string | null = null, isBacklog: boolean): void {
    if (parentId) {
      this._store.dispatch(moveSubTaskToTop({ id, parentId }));
    } else {
      const workContextId = this._workContextService.activeWorkContextId as string;
      const workContextType = this._workContextService
        .activeWorkContextType as WorkContextType;

      if (isBacklog) {
        this._workContextService.doneBacklogTaskIds$
          .pipe(take(1))
          .subscribe((doneBacklogTaskIds) => {
            if (!doneBacklogTaskIds) {
              throw new Error('No doneBacklogTaskIds found');
            }
            this._store.dispatch(
              moveProjectTaskToTopInBacklogList({
                taskId: id,
                workContextId,
                doneBacklogTaskIds,
              }),
            );
          });
      } else {
        this._workContextService.doneTaskIds$.pipe(take(1)).subscribe((doneTaskIds) => {
          this._store.dispatch(
            moveTaskToTopInTodayList({
              taskId: id,
              workContextType,
              workContextId,
              doneTaskIds,
            }),
          );
        });
      }
    }
  }

  moveToBottom(id: string, parentId: string | null = null, isBacklog: boolean): void {
    if (parentId) {
      this._store.dispatch(moveSubTaskToBottom({ id, parentId }));
    } else {
      const workContextId = this._workContextService.activeWorkContextId as string;
      const workContextType = this._workContextService
        .activeWorkContextType as WorkContextType;

      if (isBacklog) {
        this._workContextService.doneBacklogTaskIds$
          .pipe(take(1))
          .subscribe((doneBacklogTaskIds) => {
            if (!doneBacklogTaskIds) {
              throw new Error('No doneBacklogTaskIds found');
            }
            this._store.dispatch(
              moveProjectTaskToBottomInBacklogList({
                taskId: id,
                workContextId,
                doneBacklogTaskIds,
              }),
            );
          });
      } else {
        this._workContextService.doneTaskIds$.pipe(take(1)).subscribe((doneTaskIds) => {
          this._store.dispatch(
            moveTaskToBottomInTodayList({
              taskId: id,
              workContextType,
              workContextId,
              doneTaskIds,
            }),
          );
        });
      }
    }
  }

  addSubTaskTo(parentId: string): void {
    this._store.dispatch(
      addSubTask({
        task: this.createNewTaskWithDefaults({
          title: '',
          additional: { dueDay: undefined },
        }),
        parentId,
      }),
    );
  }

  addTimeSpent(
    task: Task,
    duration: number,
    date: string = this._dateService.todayStr(),
    isFromTrackingReminder = false,
  ): void {
    this._store.dispatch(
      TimeTrackingActions.addTimeSpent({ task, date, duration, isFromTrackingReminder }),
    );
  }

  removeTimeSpent(
    id: string,
    duration: number,
    date: string = this._dateService.todayStr(),
  ): void {
    this._store.dispatch(removeTimeSpent({ id, date, duration }));
  }

  focusTask(id: string): void {
    const el = document.getElementById('t-' + id);
    if (!el) {
      throw new Error('Cannot find focus el');
    }
    el.focus();
  }

  focusLastFocusedTask(): void {
    if (this._lastFocusedTaskEl) {
      this._lastFocusedTaskEl.focus();
    }
  }

  focusTaskIfPossible(id: string): void {
    const tEl = document.getElementById('t-' + id);

    if (tEl) {
      tEl.focus();
    }
  }

  focusFirstTaskIfVisible(): void {
    const tEl = document.getElementsByTagName('task');
    if (tEl && tEl[0]) {
      (tEl[0] as HTMLElement).focus();
    }
  }

  moveToArchive(tasks: TaskWithSubTasks | TaskWithSubTasks[]): void {
    if (!Array.isArray(tasks)) {
      tasks = [tasks];
    }
    // NOTE: we only update real parents since otherwise we move sub-tasks without their parent into the archive
    const subTasks = tasks.filter((t) => t.parentId);
    const parentTasks = tasks.filter((t) => !t.parentId);

    if (subTasks.length) {
      if (this._workContextService.activeWorkContextType !== WorkContextType.TAG) {
        // this should be handled by moving parentTasks to archive
        devError('Trying to move sub tasks into archive for project');
      } else {
        // when on a tag such as today, we simply remove the tag instead of attempting to move to archive
        const tagToRemove = this._workContextService.activeWorkContextId;
        subTasks.forEach((st) => {
          this.updateTags(
            st,
            st.tagIds.filter((tid) => tid !== tagToRemove),
          );
        });
      }
    }

    if (parentTasks.length) {
      // Only move parent tasks to archive, never subtasks
      this._store.dispatch(TaskSharedActions.moveToArchive({ tasks: parentTasks }));
      // Only archive parent tasks to prevent orphaned subtasks
      this._archiveService.moveTasksToArchiveAndFlushArchiveIfDue(parentTasks);
    }
  }

  moveToProject(task: TaskWithSubTasks, projectId: string): void {
    if (!!task.parentId) {
      throw new Error('Wrong task model');
    }
    this._store.dispatch(
      TaskSharedActions.moveToOtherProject({ task, targetProjectId: projectId }),
    );
  }

  moveToCurrentWorkContext(task: TaskWithSubTasks | Task): void {
    if (this._workContextService.activeWorkContextType === WorkContextType.TAG) {
      if (this._workContextService.activeWorkContextId === TODAY_TAG.id) {
        this._store.dispatch(TaskSharedActions.planTasksForToday({ taskIds: [task.id] }));
      } else {
        this.updateTags(task, [this._workContextService.activeWorkContextId as string]);
      }
    } else {
      if (!('subTasks' in task)) {
        throw new Error('Wrong task model');
      }
      this.moveToProject(task, this._workContextService.activeWorkContextId as string);
    }
  }

  toggleStartTask(): void {
    this._store.dispatch(toggleStart());
  }

  restoreTask(task: Task, subTasks: Task[]): void {
    this._store.dispatch(TaskSharedActions.restoreTask({ task, subTasks }));
  }

  async roundTimeSpentForDayEverywhere({
    day,
    taskIds,
    roundTo,
    isRoundUp = false,
    projectId,
  }: {
    day: string;
    taskIds: string[];
    roundTo: RoundTimeOption;
    isRoundUp: boolean;
    projectId?: string | null;
  }): Promise<void> {
    // NOTE: doing it this way round is quicker since it only has to be calculated when the action is triggered
    const taskState = await this.taskFeatureState$.pipe(first()).toPromise();
    const archivedIds: string[] = [];
    const todayIds: string[] = [];
    taskIds.forEach((id) => {
      if (taskState.ids.includes(id)) {
        todayIds.push(id);
      } else {
        // NOTE we don't check if they actually exist there
        archivedIds.push(id);
      }
    });

    // today
    this._store.dispatch(
      roundTimeSpentForDay({ day, taskIds: todayIds, roundTo, isRoundUp, projectId }),
    );

    // archive
    await this._taskArchiveService.roundTimeSpent({
      day,
      taskIds: archivedIds,
      roundTo,
      isRoundUp,
      projectId,
    });
  }

  // REMINDER
  // --------
  scheduleTask(
    task: Task | TaskWithSubTasks,
    due: number,
    remindCfg: TaskReminderOptionId,
    isMoveToBacklog: boolean = false,
  ): void {
    this._store.dispatch(
      TaskSharedActions.scheduleTaskWithTime({
        task,
        dueWithTime: due,
        remindAt: remindOptionToMilliseconds(due, remindCfg),
        isMoveToBacklog,
      }),
    );
  }

  reScheduleTask({
    task,
    due,
    remindCfg,
    isMoveToBacklog = false,
  }: {
    task: Task;
    due: number;
    remindCfg: TaskReminderOptionId;
    isMoveToBacklog: boolean;
  }): void {
    this._store.dispatch(
      TaskSharedActions.reScheduleTaskWithTime({
        task,
        dueWithTime: due,
        remindAt: remindOptionToMilliseconds(due, remindCfg),
        isMoveToBacklog,
      }),
    );
  }

  // ------
  getByIdOnce$(id: string): Observable<Task> {
    return this._store.pipe(select(selectTaskById, { id }), take(1));
  }

  getByIdLive$(id: string): Observable<Task> {
    return this._store.pipe(select(selectTaskById, { id }));
  }

  getByIdsLive$(ids: string[]): Observable<Task[]> {
    return this._store.pipe(select(selectTasksById, { ids }));
  }

  getByIdWithSubTaskData$(id: string): Observable<TaskWithSubTasks> {
    return this._store.pipe(select(selectTaskByIdWithSubTaskData, { id }), take(1));
  }

  getTasksByRepeatCfgId$(repeatCfgId: string): Observable<Task[]> {
    return this._store.pipe(
      select(selectTasksByRepeatConfigId, { repeatCfgId }),
      take(1),
    );
  }

  getTasksWithSubTasksByRepeatCfgId$(
    repeatCfgId: string,
  ): Observable<TaskWithSubTasks[]> {
    if (!repeatCfgId) {
      throw new Error('No repeatCfgId');
    }
    return this._store.pipe(
      select(selectTaskWithSubTasksByRepeatConfigId, { repeatCfgId }),
    );
  }

  getTasksByTag(tagId: string): Observable<TaskWithSubTasks[]> {
    return this._store.pipe(select(selectTasksByTag, { tagId }));
  }

  setDone(id: string): void {
    this.update(id, { isDone: true });
  }

  markIssueUpdatesAsRead(id: string): void {
    this.update(id, { issueWasUpdated: false });
  }

  setUnDone(id: string): void {
    this.update(id, { isDone: false });
  }

  showSubTasks(id: string): void {
    this.updateUi(id, { _hideSubTasksMode: undefined });
  }

  toggleSubTaskMode(
    taskId: string,
    isShowLess: boolean = true,
    isEndless: boolean = false,
  ): void {
    this._store.dispatch(toggleTaskHideSubTasks({ taskId, isShowLess, isEndless }));
  }

  hideSubTasks(id: string): void {
    this.updateUi(id, { _hideSubTasksMode: HideSubTasksMode.HideAll });
  }

  async convertToMainTask(task: Task): Promise<void> {
    const parent = await this.getByIdOnce$(task.parentId as string).toPromise();
    this._store.dispatch(
      TaskSharedActions.convertToMainTask({
        task,
        parentTagIds: parent.tagIds,
        isPlanForToday: this._workContextService.activeWorkContextId === TODAY_TAG.id,
      }),
    );
  }

  // GLOBAL TASK MODEL STUFF
  // -----------------------

  // BEWARE: does only work for task model updates, but not for related models
  async updateEverywhere(id: string, changedFields: Partial<Task>): Promise<void> {
    const state = await this.taskFeatureState$.pipe(first()).toPromise();
    const { entities } = state;
    if (entities[id]) {
      this.update(id, changedFields);
    } else {
      await this.updateArchiveTask(id, changedFields);
    }
  }

  // TODO remove in favor of calling this directly
  // BEWARE: does only work for task model updates, but not the meta models
  async updateArchiveTask(id: string, changedFields: Partial<Task>): Promise<void> {
    return this._taskArchiveService.updateTask(id, changedFields);
  }

  // BEWARE: does only work for task model updates, but not the meta models
  async updateArchiveTasks(updates: Update<Task>[]): Promise<void> {
    return this._taskArchiveService.updateTasks(updates);
  }

  async getByIdFromEverywhere(id: string, isArchive?: boolean): Promise<Task> {
    if (isArchive === undefined) {
      const task = await this.getByIdOnce$(id).toPromise();
      if (task) {
        return task;
      }
      return await this._taskArchiveService.getById(id);
    }

    if (isArchive) {
      return await this._taskArchiveService.getById(id);
    } else {
      return await this.getByIdOnce$(id).toPromise();
    }
  }

  async getAllTasksForProject(projectId: string): Promise<Task[]> {
    const allTasks = await this._allTasks$.pipe(first()).toPromise();
    const archiveTaskState: TaskArchive = await this._taskArchiveService.load();
    const ids = (archiveTaskState && (archiveTaskState.ids as string[])) || [];
    const archiveTasks = ids.map((id) => archiveTaskState.entities[id]);
    return [...allTasks, ...archiveTasks].filter(
      (task) => (task as Task).projectId === projectId,
    ) as Task[];
  }

  async getArchiveTasksForRepeatCfgId(repeatCfgId: string): Promise<Task[]> {
    const archiveTaskState: TaskArchive = await this._taskArchiveService.load();
    const ids = (archiveTaskState && (archiveTaskState.ids as string[])) || [];
    const archiveTasks = ids.map((id) => archiveTaskState.entities[id]);
    return archiveTasks.filter(
      (task) => (task as Task).repeatCfgId === repeatCfgId,
    ) as Task[];
  }

  async getArchivedTasks(): Promise<Task[]> {
    const archiveTaskState: TaskArchive = await this._taskArchiveService.load();
    const ids = (archiveTaskState && (archiveTaskState.ids as string[])) || [];
    const archiveTasks = ids.map((id) => archiveTaskState.entities[id]) as Task[];
    return archiveTasks;
  }

  async getAllIssueIdsForProject(
    projectId: string,
    issueProviderKey: IssueProviderKey,
  ): Promise<string[]> {
    const allTasks = await this.getAllTasksForProject(projectId);
    return allTasks
      .filter((task) => task.issueType === issueProviderKey)
      .map((task) => task.issueId) as string[];
  }

  async getAllIssueIdsForProviderEverywhere(issueProviderId: string): Promise<string[]> {
    const allTasks = await this.getAllTasksEverywhere();
    return allTasks
      .filter((task) => task.issueProviderId === issueProviderId)
      .map((task) => task.issueId) as string[];
  }

  async getAllTasksEverywhere(): Promise<Task[]> {
    const allTasks = await this._allTasks$.pipe(first()).toPromise();
    const archiveTaskState: TaskArchive = await this._taskArchiveService.load();
    const ids = (archiveTaskState && (archiveTaskState.ids as string[])) || [];
    const archiveTasks = ids.map((id) => archiveTaskState.entities[id]);
    return [...allTasks, ...archiveTasks] as Task[];
  }

  async checkForTaskWithIssueEverywhere(
    issueId: string | number,
    issueProviderKey: IssueProviderKey,
    issueProviderId: string,
  ): Promise<{
    task: Task;
    subTasks: Task[] | null;
    isFromArchive: boolean;
  } | null> {
    if (!issueProviderId) {
      throw new Error('No issueProviderId');
    }

    const findTaskFn = (task: Task | ArchiveTask | undefined): boolean =>
      !!task &&
      // NOTE: we check all, since it is theoretically possible for the same issueId to appear across issue providers
      task.issueId === issueId &&
      task.issueType === issueProviderKey &&
      task.issueProviderId === issueProviderId;

    const allTasks = (await this._allTasks$.pipe(first()).toPromise()) as Task[];
    const taskWithSameIssue: Task = allTasks.find(findTaskFn) as Task;

    if (taskWithSameIssue) {
      return {
        task: taskWithSameIssue,
        isFromArchive: false,
        subTasks: null,
      };
    } else {
      const archiveTaskState: TaskArchive = await this._taskArchiveService.load();
      const ids = archiveTaskState && (archiveTaskState.ids as string[]);
      if (ids) {
        const archiveTaskWithSameIssue = ids
          .map((id) => archiveTaskState.entities[id])
          .find(findTaskFn);

        return archiveTaskWithSameIssue
          ? {
              task: archiveTaskWithSameIssue as Task,
              subTasks: archiveTaskWithSameIssue.subTaskIds
                ? (archiveTaskWithSameIssue.subTaskIds.map(
                    (id) => archiveTaskState.entities[id],
                  ) as Task[])
                : null,
              isFromArchive: true,
            }
          : null;
      }
      return null;
    }
  }

  createNewTaskWithDefaults({
    title,
    additional = {},
    workContextType = this._workContextService.activeWorkContextType as WorkContextType,
    workContextId = this._workContextService.activeWorkContextId as string,
  }: {
    title: string | null;
    additional?: Partial<Task>;
    workContextType?: WorkContextType;
    workContextId?: string;
  }): Task {
    const d1 = {
      // NOTE needs to be created every time
      ...DEFAULT_TASK,
      created: Date.now(),
      title: title as string,
      id: nanoid(),

      ...(workContextType === WorkContextType.PROJECT
        ? { projectId: workContextId }
        : {
            projectId:
              this._globalConfigService.cfg?.misc.defaultProjectId || INBOX_PROJECT.id,
          }),

      tagIds:
        workContextType === WorkContextType.TAG &&
        !additional.parentId &&
        workContextId !== TODAY_TAG.id
          ? [workContextId]
          : [],

      ...(workContextId === TODAY_TAG.id && !additional.parentId
        ? { dueDay: getWorklogStr() }
        : {}),

      ...additional,
    };

    if (d1.projectId === undefined) {
      return { ...d1, projectId: INBOX_PROJECT.id };
    }
    return d1;
  }
}
