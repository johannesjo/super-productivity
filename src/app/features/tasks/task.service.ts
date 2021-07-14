import * as shortid from 'shortid';
import {
  delay,
  filter,
  first,
  map,
  switchMap,
  take,
  withLatestFrom,
} from 'rxjs/operators';
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
  AddSubTask,
  AddTask,
  AddTimeSpent,
  ConvertToMainTask,
  DeleteMainTasks,
  DeleteTask,
  MoveSubTask,
  MoveSubTaskDown,
  MoveSubTaskUp,
  MoveToArchive,
  MoveToOtherProject,
  RemoveTagsForAllTasks,
  RemoveTimeSpent,
  ReScheduleTask,
  RestoreTask,
  RoundTimeSpentForDay,
  ScheduleTask,
  SetCurrentTask,
  SetSelectedTask,
  ToggleStart,
  ToggleTaskShowSubTasks,
  UnScheduleTask,
  UnsetCurrentTask,
  UpdateTask,
  UpdateTaskTags,
  UpdateTaskUi,
} from './store/task.actions';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { IssueProviderKey } from '../issue/issue.model';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';
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
import { getWorklogStr } from '../../util/get-work-log-str';
import { RoundTimeOption } from '../project/project.model';
import { TagService } from '../tag/tag.service';
import { TODAY_TAG } from '../tag/tag.const';
import { WorkContextService } from '../work-context/work-context.service';
import { WorkContextType } from '../work-context/work-context.model';
import {
  moveTaskDownInBacklogList,
  moveTaskDownInTodayList,
  moveTaskInBacklogList,
  moveTaskInTodayList,
  moveTaskToBacklogList,
  moveTaskToBacklogListAuto,
  moveTaskToTodayList,
  moveTaskToTodayListAuto,
  moveTaskUpInBacklogList,
  moveTaskUpInTodayList,
} from '../work-context/store/work-context-meta.actions';
import { Router } from '@angular/router';
import { unique } from '../../util/unique';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { ImexMetaService } from '../../imex/imex-meta/imex-meta.service';
import { remindOptionToMilliseconds } from './util/remind-option-to-milliseconds';
import { getDateRangeForDay } from '../../util/get-date-range-for-day';

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
    private readonly _timeTrackingService: TimeTrackingService,
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

  getAllParentWithoutTag$(tagId: string) {
    return this._store.pipe(select(selectMainTasksWithoutTag, { tagId }));
  }

  // META

  // ----
  setCurrentId(id: string | null) {
    if (id) {
      this._store.dispatch(new SetCurrentTask(id));
    } else {
      this._store.dispatch(new UnsetCurrentTask());
    }
  }

  setSelectedId(
    id: string | null,
    taskAdditionalInfoTargetPanel: TaskAdditionalInfoTargetPanel = TaskAdditionalInfoTargetPanel.Default,
  ) {
    this._store.dispatch(new SetSelectedTask({ id, taskAdditionalInfoTargetPanel }));
  }

  startFirstStartable() {
    this._workContextService.startableTasksForActiveContext$
      .pipe(take(1))
      .subscribe((tasks) => {
        if (tasks[0] && !this.currentTaskId) {
          this.setCurrentId(tasks[0].id);
        }
      });
  }

  pauseCurrent() {
    this._store.dispatch(new UnsetCurrentTask());
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
      new AddTask({
        task,
        workContextId,
        workContextType,
        isAddToBacklog,
        isAddToBottom,
      }),
    );
    return task && task.id;
  }

  remove(task: TaskWithSubTasks) {
    this._store.dispatch(new DeleteTask({ task }));
  }

  removeMultipleMainTasks(taskIds: string[]) {
    this._store.dispatch(new DeleteMainTasks({ taskIds }));
  }

  update(id: string, changedFields: Partial<Task>) {
    this._store.dispatch(
      new UpdateTask({
        task: { id, changes: changedFields },
      }),
    );
  }

  addTodayTag(t: Task) {
    if (t.parentId) {
      throw new Error('Sub task cannot be added a today tag');
    }
    this.updateTags(t, [TODAY_TAG.id, ...t.tagIds], t.tagIds);
  }

  updateTags(task: Task, newTagIds: string[], oldTagIds: string[]) {
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
        new UpdateTaskTags({
          task,
          newTagIds: unique(newTagIds),
          oldTagIds,
        }),
      );
    }
  }

  removeTagsForAllTask(tagsToRemove: string[]) {
    this._store.dispatch(
      new RemoveTagsForAllTasks({
        tagIdsToRemove: tagsToRemove,
      }),
    );
  }

  // TODO: Move logic away from service class (to actions)?
  // TODO: Should this reside in tagService?
  purgeUnusedTags(tagIds: string[]) {
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

  updateUi(id: string, changes: Partial<Task>) {
    this._store.dispatch(
      new UpdateTaskUi({
        task: { id, changes },
      }),
    );
  }

  move(
    taskId: string,
    src: DropListModelSource,
    target: DropListModelSource,
    newOrderedIds: string[],
  ) {
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
        moveTaskInBacklogList({ taskId, newOrderedIds, workContextId }),
      );
    } else if (src === 'BACKLOG' && isTargetTodayList) {
      // move from backlog to today
      this._store.dispatch(
        moveTaskToTodayList({ taskId, newOrderedIds, src, target, workContextId }),
      );
    } else if (isSrcTodayList && target === 'BACKLOG') {
      // move from today to backlog
      this._store.dispatch(
        moveTaskToBacklogList({ taskId, newOrderedIds, workContextId }),
      );
    } else {
      // move sub task
      this._store.dispatch(
        new MoveSubTask({ taskId, srcTaskId: src, targetTaskId: target, newOrderedIds }),
      );
    }
  }

  moveUp(id: string, parentId: string | null = null, isBacklog: boolean) {
    if (parentId) {
      this._store.dispatch(new MoveSubTaskUp({ id, parentId }));
    } else {
      const workContextId = this._workContextService.activeWorkContextId as string;
      const workContextType = this._workContextService
        .activeWorkContextType as WorkContextType;

      if (isBacklog) {
        this._store.dispatch(moveTaskUpInBacklogList({ taskId: id, workContextId }));
      } else {
        this._store.dispatch(
          moveTaskUpInTodayList({ taskId: id, workContextType, workContextId }),
        );
      }
    }
  }

  moveDown(id: string, parentId: string | null = null, isBacklog: boolean) {
    if (parentId) {
      this._store.dispatch(new MoveSubTaskDown({ id, parentId }));
    } else {
      const workContextId = this._workContextService.activeWorkContextId as string;
      const workContextType = this._workContextService
        .activeWorkContextType as WorkContextType;

      if (isBacklog) {
        this._store.dispatch(moveTaskDownInBacklogList({ taskId: id, workContextId }));
      } else {
        this._store.dispatch(
          moveTaskDownInTodayList({ taskId: id, workContextType, workContextId }),
        );
      }
    }
  }

  addSubTaskTo(parentId: string) {
    this._store.dispatch(
      new AddSubTask({
        task: this.createNewTaskWithDefaults({ title: '' }),
        parentId,
      }),
    );
  }

  addTimeSpent(task: Task, duration: number, date: string = getWorklogStr()) {
    this._store.dispatch(new AddTimeSpent({ task, date, duration }));
  }

  removeTimeSpent(id: string, duration: number, date: string = getWorklogStr()) {
    this._store.dispatch(new RemoveTimeSpent({ id, date, duration }));
  }

  focusTask(id: string) {
    const el = document.getElementById('t-' + id);
    if (!el) {
      throw new Error('Cannot find focus el');
    }
    el.focus();
  }

  focusTaskIfPossible(id: string) {
    const tEl = document.getElementById('t-' + id);

    if (tEl) {
      tEl.focus();
    }
  }

  focusFirstTaskIfVisible() {
    const tEl = document.getElementsByTagName('task');
    if (tEl && tEl[0]) {
      (tEl[0] as HTMLElement).focus();
    }
  }

  moveToProjectTodayList(id: string, isMoveToTop: boolean = false) {
    const workContextId = this._workContextService.activeWorkContextId as string;
    const workContextType = this._workContextService
      .activeWorkContextType as WorkContextType;
    if (workContextType === WorkContextType.PROJECT) {
      this._store.dispatch(
        moveTaskToTodayListAuto({ taskId: id, isMoveToTop, workContextId }),
      );
    }
  }

  moveToBacklog(id: string) {
    const workContextId = this._workContextService.activeWorkContextId as string;
    const workContextType = this._workContextService
      .activeWorkContextType as WorkContextType;
    if (workContextType === WorkContextType.PROJECT) {
      this._store.dispatch(moveTaskToBacklogListAuto({ taskId: id, workContextId }));
    }
  }

  moveToArchive(tasks: TaskWithSubTasks | TaskWithSubTasks[]) {
    if (!Array.isArray(tasks)) {
      tasks = [tasks];
    }
    this._store.dispatch(new MoveToArchive({ tasks }));
  }

  moveToProject(task: TaskWithSubTasks, projectId: string) {
    if (!!task.parentId || !!task.issueId) {
      throw new Error('Wrong task model');
    }
    this._store.dispatch(new MoveToOtherProject({ task, targetProjectId: projectId }));
  }

  toggleStartTask() {
    this._store.dispatch(new ToggleStart());
  }

  restoreTask(task: Task, subTasks: Task[]) {
    this._store.dispatch(new RestoreTask({ task, subTasks }));
  }

  roundTimeSpentForDay({
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
  }) {
    this._store.dispatch(
      new RoundTimeSpentForDay({ day, taskIds, roundTo, isRoundUp, projectId }),
    );
  }

  startTaskFromOtherContext$(
    taskId: string,
    workContextType: WorkContextType,
    workContextId: string,
  ): Observable<any> {
    const base = workContextType === WorkContextType.TAG ? 'tag' : 'project';
    this._router.navigate([`/${base}/${workContextId}/tasks`]);
    // NOTE: route is the only mechanism to trigger this
    // this._workContextService._setActiveContext(workContextId, workContextType);

    const contextChanged$ = this._workContextService.activeWorkContextId$.pipe(
      filter((id) => id === workContextId),
      // wait for actual data to be loaded
      switchMap(() => this._workContextService.activeWorkContext$),
      // dirty dirty fix
      delay(50),
      first(),
    );
    const task$ = contextChanged$.pipe(
      switchMap(() => this.getByIdOnce$(taskId)),
      take(1),
    );

    if (workContextType === WorkContextType.PROJECT) {
      task$.subscribe((task) => {
        if (!task) {
          console.log({
            taskId,
            workContextType,
            workContextId,
            activeWCId: this._workContextService.activeWorkContextId,
          });
          throw new Error('Startable task not found');
        }
        if (task.parentId) {
          this.moveToProjectTodayList(task.parentId, true);
        } else {
          this.moveToProjectTodayList(task.id, true);
        }
        this.setCurrentId(task.id);
      });
      return task$;
    } else if (workContextType === WorkContextType.TAG) {
      task$.subscribe((task) => {
        this.setCurrentId(task.id);
      });
    } else {
      throw new Error('Äh no');
    }
    return task$;
  }

  // REMINDER
  // --------
  scheduleTask(
    task: Task | TaskWithSubTasks,
    plannedAt: number,
    remindCfg: TaskReminderOptionId,
    isMoveToBacklog: boolean = false,
  ) {
    console.log(remindOptionToMilliseconds(plannedAt, remindCfg), plannedAt);
    console.log((remindOptionToMilliseconds(plannedAt, remindCfg) as number) - plannedAt);
    console.log({
      plannedAt,
      remindCfg,
    });
    this._store.dispatch(
      new ScheduleTask({
        task,
        plannedAt,
        remindAt: remindOptionToMilliseconds(plannedAt, remindCfg),
        isMoveToBacklog,
      }),
    );
  }

  reScheduleTask({
    taskId,
    plannedAt,
    reminderId,
    remindCfg,
    title,
  }: {
    taskId: string;
    plannedAt: number;
    title: string;
    reminderId?: string;
    remindCfg: TaskReminderOptionId;
  }) {
    this._store.dispatch(
      new ReScheduleTask({
        id: taskId,
        plannedAt,
        reminderId,
        remindAt: remindOptionToMilliseconds(plannedAt, remindCfg),
        title,
      }),
    );
  }

  unScheduleTask(taskId: string, reminderId?: string, isSkipToast?: boolean) {
    if (!taskId) {
      throw new Error('No task id');
    }
    this._store.dispatch(new UnScheduleTask({ id: taskId, reminderId, isSkipToast }));
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

  setDone(id: string) {
    this.update(id, { isDone: true });
  }

  markIssueUpdatesAsRead(id: string) {
    this.update(id, { issueWasUpdated: false });
  }

  setUnDone(id: string) {
    this.update(id, { isDone: false });
  }

  showSubTasks(id: string) {
    this.updateUi(id, { _showSubTasksMode: ShowSubTasksMode.Show });
  }

  toggleSubTaskMode(
    taskId: string,
    isShowLess: boolean = true,
    isEndless: boolean = false,
  ) {
    this._store.dispatch(new ToggleTaskShowSubTasks({ taskId, isShowLess, isEndless }));
  }

  hideSubTasks(id: string) {
    this.updateUi(id, { _showSubTasksMode: ShowSubTasksMode.HideAll });
  }

  async convertToMainTask(task: Task) {
    const parent = await this.getByIdOnce$(task.parentId as string).toPromise();
    this._store.dispatch(new ConvertToMainTask({ task, parentTagIds: parent.tagIds }));
  }

  // GLOBAL TASK MODEL STUFF
  // -----------------------

  // BEWARE: does only work for task model updates, but not for related models
  async updateEverywhere(id: string, changedFields: Partial<Task>) {
    const state = await this.taskFeatureState$.pipe(first()).toPromise();
    const { entities } = state;
    if (entities[id]) {
      this.update(id, changedFields);
    } else {
      await this.updateArchiveTask(id, changedFields);
    }
  }

  // BEWARE: does only work for task model updates, but not the meta models
  async updateArchiveTask(id: string, changedFields: Partial<Task>): Promise<any> {
    return await this._persistenceService.taskArchive.execAction(
      new UpdateTask({
        task: {
          id,
          changes: changedFields,
        },
      }),
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

    const findTaskFn = (task: Task | ArchiveTask | undefined) =>
      task &&
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
  async movePlannedTasksToToday(plannedTasks: TaskPlanned[]) {
    return Promise.all(
      plannedTasks.map(async (t) => {
        if (t.parentId) {
          this.moveToProjectTodayList(t.parentId);
          // NOTE: no unsubscribe on purpose as we always want this to run until done
          const parentTask = await this.getByIdOnce$(t.parentId).toPromise();
          this.addTodayTag(parentTask);
        } else {
          this.moveToProjectTodayList(t.id);
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
      id: shortid(),

      projectId: workContextType === WorkContextType.PROJECT ? workContextId : null,
      tagIds:
        workContextType === WorkContextType.TAG && !additional.parentId
          ? [workContextId]
          : [],

      ...additional,
    };
  }
}
