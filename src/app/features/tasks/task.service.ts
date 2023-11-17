import { nanoid } from 'nanoid';
import { first, map, take, withLatestFrom } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ArchiveTask,
  DEFAULT_TASK,
  DropListModelSource,
  ShowSubTasksMode,
  Task,
  TaskAdditionalInfoTargetPanel,
  TaskArchive,
  TaskPlanned,
  TaskReminderOptionId,
  TaskState,
  TaskWithSubTasks,
} from './task.model';
import { select, Store } from '@ngrx/store';
import {
  addSubTask,
  addTask,
  addTimeSpent,
  convertToMainTask,
  deleteTask,
  deleteTasks,
  moveSubTask,
  moveSubTaskDown,
  moveSubTaskToBottom,
  moveSubTaskToTop,
  moveSubTaskUp,
  moveToArchive,
  moveToOtherProject,
  removeTagsForAllTasks,
  removeTimeSpent,
  reScheduleTask,
  restoreTask,
  roundTimeSpentForDay,
  scheduleTask,
  setCurrentTask,
  setSelectedTask,
  toggleStart,
  toggleTaskShowSubTasks,
  unScheduleTask,
  unsetCurrentTask,
  updateTask,
  updateTaskTags,
  updateTaskUi,
} from './store/task.actions';
import { PersistenceService } from '../../core/persistence/persistence.service';
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
  selectTaskAdditionalInfoTargetPanel,
  selectTaskById,
  selectTaskByIdWithSubTaskData,
  selectTaskFeatureState,
  selectTasksById,
  selectTasksByRepeatConfigId,
  selectTasksByTag,
  selectTasksPlannedForRangeNotOnToday,
  selectTaskWithSubTasksByRepeatConfigId,
} from './store/task.selectors';
import { RoundTimeOption } from '../project/project.model';
import { TagService } from '../tag/tag.service';
import { TODAY_TAG } from '../tag/tag.const';
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
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { ImexMetaService } from '../../imex/imex-meta/imex-meta.service';
import { remindOptionToMilliseconds } from './util/remind-option-to-milliseconds';
import { getDateRangeForDay } from '../../util/get-date-range-for-day';
import { ProjectService } from '../project/project.service';
import {
  moveProjectTaskDownInBacklogList,
  moveProjectTaskInBacklogList,
  moveProjectTaskToBacklogList,
  moveProjectTaskToBottomInBacklogList,
  moveProjectTaskToTodayList,
  moveProjectTaskToTopInBacklogList,
  moveProjectTaskUpInBacklogList,
} from '../project/store/project.actions';
import { Update } from '@ngrx/entity';
import { DateService } from 'src/app/core/date/date.service';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
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

  selectedTask$: Observable<TaskWithSubTasks> = this._store.pipe(
    select(selectSelectedTask),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  taskAdditionalInfoTargetPanel$: Observable<TaskAdditionalInfoTargetPanel | null> =
    this._store.pipe(
      select(selectTaskAdditionalInfoTargetPanel),
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

  // NOTE: this should work fine as long as the user restarts the app every day
  // if not worst case is, that the buttons don't appear or today is shown as tomorrow
  allPlannedForTodayNotOnToday$: Observable<TaskPlanned[]> = this._store.pipe(
    select(selectTasksPlannedForRangeNotOnToday, getDateRangeForDay(Date.now())),
  );

  // NOTE: this should work fine as long as the user restarts the app every day
  // if not worst case is, that the buttons don't appear or today is shown as tomorrow
  allPlannedForTomorrowNotOnToday$: Observable<TaskPlanned[]> = this._store.pipe(
    select(
      selectTasksPlannedForRangeNotOnToday,
      // eslint-disable-next-line no-mixed-operators
      getDateRangeForDay(Date.now() + 24 * 60 * 60 * 1000),
    ),
  );

  // META FIELDS
  // -----------
  currentTaskProgress$: Observable<number> = this.currentTask$.pipe(
    map((task) =>
      task && task.timeEstimate > 0 ? task.timeSpent / task.timeEstimate : 0,
    ),
  );

  private _allTasks$: Observable<Task[]> = this._store.pipe(select(selectAllTasks));

  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
    private readonly _tagService: TagService,
    private readonly _workContextService: WorkContextService,
    private readonly _imexMetaService: ImexMetaService,
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    private readonly _timeTrackingService: GlobalTrackingIntervalService,
    private readonly _dateService: DateService,
    private readonly _router: Router,
  ) {
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
    taskAdditionalInfoTargetPanel: TaskAdditionalInfoTargetPanel = TaskAdditionalInfoTargetPanel.Default,
  ): void {
    this._store.dispatch(setSelectedTask({ id, taskAdditionalInfoTargetPanel }));
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

    this._store.dispatch(
      addTask({
        task,
        workContextId,
        workContextType,
        isAddToBacklog,
        isAddToBottom,
      }),
    );
    return task && task.id;
  }

  remove(task: TaskWithSubTasks): void {
    this._store.dispatch(deleteTask({ task }));
  }

  removeMultipleTasks(taskIds: string[]): void {
    this._store.dispatch(deleteTasks({ taskIds }));
  }

  update(id: string, changedFields: Partial<Task>): void {
    this._store.dispatch(
      updateTask({
        task: { id, changes: changedFields },
      }),
    );
  }

  addTodayTag(t: Task): void {
    if (t.parentId) {
      throw new Error('Sub task cannot be added a today tag');
    }
    this.updateTags(t, [TODAY_TAG.id, ...t.tagIds], t.tagIds);
  }

  updateTags(task: Task, newTagIds: string[], oldTagIds: string[]): void {
    if (task.parentId) {
      throw new Error('Editing sub task tags should not be possible.');
    }

    if (!task.projectId && newTagIds.length === 0) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.TASK.S.LAST_TAG_DELETION_WARNING,
      });
    } else {
      this._store.dispatch(
        updateTaskTags({
          task,
          newTagIds: unique(newTagIds),
          oldTagIds,
        }),
      );
    }
  }

  removeTagsForAllTask(tagsToRemove: string[]): void {
    this._store.dispatch(
      removeTagsForAllTasks({
        tagIdsToRemove: tagsToRemove,
      }),
    );
  }

  // TODO: Move logic away from service class (to actions)?
  // TODO: Should this reside in tagService?
  purgeUnusedTags(tagIds: string[]): void {
    tagIds.forEach((tagId) => {
      this.getTasksByTag(tagId)
        .pipe(take(1))
        .subscribe((tasks) => {
          console.log(
            `Tag is present on ${tasks.length} tasks => ${
              tasks.length ? 'keeping...' : 'deleting...'
            }`,
          );
          if (tasks.length === 0 && tagId !== TODAY_TAG.id) {
            this._tagService.removeTag(tagId);
          }
        });
    });
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
        moveProjectTaskToTodayList({ taskId, newOrderedIds, src, target, workContextId }),
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

  moveUp(id: string, parentId: string | null = null, isBacklog: boolean): void {
    if (parentId) {
      this._store.dispatch(moveSubTaskUp({ id, parentId }));
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
              moveProjectTaskUpInBacklogList({
                taskId: id,
                workContextId,
                doneBacklogTaskIds,
              }),
            );
          });
      } else {
        this._workContextService.doneTaskIds$.pipe(take(1)).subscribe((doneTaskIds) => {
          this._store.dispatch(
            moveTaskUpInTodayList({
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

  moveDown(id: string, parentId: string | null = null, isBacklog: boolean): void {
    if (parentId) {
      this._store.dispatch(moveSubTaskDown({ id, parentId }));
    } else {
      const workContextId = this._workContextService.activeWorkContextId as string;
      const workContextType = this._workContextService
        .activeWorkContextType as WorkContextType;

      // this.
      if (isBacklog) {
        this._workContextService.doneBacklogTaskIds$
          .pipe(take(1))
          .subscribe((doneBacklogTaskIds) => {
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
          });
      } else {
        this._workContextService.doneTaskIds$.pipe(take(1)).subscribe((doneTaskIds) => {
          this._store.dispatch(
            moveTaskDownInTodayList({
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
        task: this.createNewTaskWithDefaults({ title: '' }),
        parentId,
      }),
    );
  }

  addTimeSpent(
    task: Task,
    duration: number,
    date: string = this._dateService.todayStr(),
  ): void {
    this._store.dispatch(addTimeSpent({ task, date, duration }));
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
    this._store.dispatch(moveToArchive({ tasks }));
  }

  moveToProject(task: TaskWithSubTasks, projectId: string): void {
    if (!!task.parentId || !!task.issueId) {
      throw new Error('Wrong task model');
    }
    this._store.dispatch(moveToOtherProject({ task, targetProjectId: projectId }));
  }

  toggleStartTask(): void {
    this._store.dispatch(toggleStart());
  }

  restoreTask(task: Task, subTasks: Task[]): void {
    this._store.dispatch(restoreTask({ task, subTasks }));
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
    await this._persistenceService.taskArchive.execAction(
      roundTimeSpentForDay({ day, taskIds: archivedIds, roundTo, isRoundUp, projectId }),
    );
  }

  // REMINDER
  // --------
  scheduleTask(
    task: Task | TaskWithSubTasks,
    plannedAt: number,
    remindCfg: TaskReminderOptionId,
    isMoveToBacklog: boolean = false,
  ): void {
    console.log(remindOptionToMilliseconds(plannedAt, remindCfg), plannedAt);
    console.log((remindOptionToMilliseconds(plannedAt, remindCfg) as number) - plannedAt);
    console.log({
      plannedAt,
      remindCfg,
    });
    this._store.dispatch(
      scheduleTask({
        task,
        plannedAt,
        remindAt: remindOptionToMilliseconds(plannedAt, remindCfg),
        isMoveToBacklog,
      }),
    );
  }

  reScheduleTask({
    task,
    plannedAt,
    remindCfg,
    isMoveToBacklog = false,
  }: {
    task: Task;
    plannedAt: number;
    remindCfg: TaskReminderOptionId;
    isMoveToBacklog: boolean;
  }): void {
    this._store.dispatch(
      reScheduleTask({
        task,
        plannedAt,
        remindAt: remindOptionToMilliseconds(plannedAt, remindCfg),
        isMoveToBacklog,
      }),
    );
  }

  unScheduleTask(taskId: string, reminderId?: string, isSkipToast?: boolean): void {
    if (!taskId) {
      throw new Error('No task id');
    }
    this._store.dispatch(unScheduleTask({ id: taskId, reminderId, isSkipToast }));
  }

  // HELPER
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
    this.updateUi(id, { _showSubTasksMode: ShowSubTasksMode.Show });
  }

  toggleSubTaskMode(
    taskId: string,
    isShowLess: boolean = true,
    isEndless: boolean = false,
  ): void {
    this._store.dispatch(toggleTaskShowSubTasks({ taskId, isShowLess, isEndless }));
  }

  hideSubTasks(id: string): void {
    this.updateUi(id, { _showSubTasksMode: ShowSubTasksMode.HideAll });
  }

  async convertToMainTask(task: Task): Promise<void> {
    const parent = await this.getByIdOnce$(task.parentId as string).toPromise();
    this._store.dispatch(convertToMainTask({ task, parentTagIds: parent.tagIds }));
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

  // BEWARE: does only work for task model updates, but not the meta models
  async updateArchiveTask(id: string, changedFields: Partial<Task>): Promise<void> {
    await this._persistenceService.taskArchive.execAction(
      updateTask({
        task: {
          id,
          changes: changedFields,
        },
      }),
    );
  }

  // BEWARE: does only work for task model updates, but not the meta models
  async updateArchiveTasks(updates: Update<Task>[]): Promise<void> {
    await this._persistenceService.taskArchive.execActions(
      updates.map((upd) => updateTask({ task: upd })),
    );
  }

  async getByIdFromEverywhere(id: string): Promise<Task> {
    return (
      (await this._persistenceService.task.getById(id)) ||
      (await this._persistenceService.taskArchive.getById(id))
    );
  }

  async getAllTasksForProject(projectId: string): Promise<Task[]> {
    const allTasks = await this._allTasks$.pipe(first()).toPromise();
    const archiveTaskState: TaskArchive =
      await this._persistenceService.taskArchive.loadState();
    const ids = (archiveTaskState && (archiveTaskState.ids as string[])) || [];
    const archiveTasks = ids.map((id) => archiveTaskState.entities[id]);
    return [...allTasks, ...archiveTasks].filter(
      (task) => (task as Task).projectId === projectId,
    ) as Task[];
  }

  async getArchiveTasksForRepeatCfgId(repeatCfgId: string): Promise<Task[]> {
    const archiveTaskState: TaskArchive =
      await this._persistenceService.taskArchive.loadState();
    const ids = (archiveTaskState && (archiveTaskState.ids as string[])) || [];
    const archiveTasks = ids.map((id) => archiveTaskState.entities[id]);
    return archiveTasks.filter(
      (task) => (task as Task).repeatCfgId === repeatCfgId,
    ) as Task[];
  }

  async getArchivedTasks(): Promise<Task[]> {
    const archiveTaskState: TaskArchive =
      await this._persistenceService.taskArchive.loadState(true);
    const ids = (archiveTaskState && (archiveTaskState.ids as string[])) || [];
    const archiveTasks = ids.map((id) => archiveTaskState.entities[id]) as Task[];
    return archiveTasks;
  }

  async getAllTaskByIssueTypeForProject$(
    projectId: string,
    issueProviderKey: IssueProviderKey,
  ): Promise<Task[]> {
    const allTasks = await this.getAllTasksForProject(projectId);
    return allTasks.filter((task) => task.issueType === issueProviderKey);
  }

  async getAllIssueIdsForProject(
    projectId: string,
    issueProviderKey: IssueProviderKey,
  ): Promise<string[] | number[]> {
    const allTasks = await this.getAllTasksForProject(projectId);
    return allTasks
      .filter((task) => task.issueType === issueProviderKey)
      .map((task) => task.issueId) as string[] | number[];
  }

  // TODO check with new archive
  async checkForTaskWithIssueInProject(
    issueId: string | number,
    issueProviderKey: IssueProviderKey,
    projectId: string,
  ): Promise<{
    task: Task;
    subTasks: Task[] | null;
    isFromArchive: boolean;
  } | null> {
    if (!projectId) {
      throw new Error('No project id');
    }

    const findTaskFn = (task: Task | ArchiveTask | undefined): boolean =>
      !!task &&
      task.issueId === issueId &&
      task.issueType === issueProviderKey &&
      task.projectId === projectId;
    const allTasks = (await this._allTasks$.pipe(first()).toPromise()) as Task[];
    const taskWithSameIssue: Task = allTasks.find(findTaskFn) as Task;

    if (taskWithSameIssue) {
      return {
        task: taskWithSameIssue,
        isFromArchive: false,
        subTasks: null,
      };
    } else {
      const archiveTaskState: TaskArchive =
        await this._persistenceService.taskArchive.loadState();
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

  // NOTE: there is a duplicate of this in plan-tasks-tomorrow.component
  async movePlannedTasksToToday(plannedTasks: TaskPlanned[]): Promise<unknown> {
    return Promise.all(
      plannedTasks.map(async (t) => {
        if (t.parentId) {
          if (t.projectId) {
            this._projectService.moveTaskToTodayList(t.parentId, t.projectId);
          }
          // NOTE: no unsubscribe on purpose as we always want this to run until done
          const parentTask = await this.getByIdOnce$(t.parentId).toPromise();
          this.addTodayTag(parentTask);
        } else {
          if (t.projectId) {
            this._projectService.moveTaskToTodayList(t.id, t.projectId);
          }
          this.addTodayTag(t);
        }
      }),
    );
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
    return {
      // NOTE needs to be created every time
      ...DEFAULT_TASK,
      created: Date.now(),
      title: title as string,
      id: nanoid(),

      projectId: workContextType === WorkContextType.PROJECT ? workContextId : null,
      tagIds:
        workContextType === WorkContextType.TAG && !additional.parentId
          ? [workContextId]
          : [],

      ...additional,
    };
  }
}
