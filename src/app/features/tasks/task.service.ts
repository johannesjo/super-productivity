import shortid from 'shortid';
import {delay, filter, first, map, switchMap, take, withLatestFrom} from 'rxjs/operators';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
  DEFAULT_TASK,
  DropListModelSource,
  SHORT_SYNTAX_REG_EX,
  ShowSubTasksMode,
  Task,
  TaskAdditionalInfoTargetPanel,
  TaskArchive,
  TaskState,
  TaskWithSubTasks
} from './task.model';
import {select, Store} from '@ngrx/store';
import {
  AddSubTask,
  AddTask,
  AddTaskReminder,
  AddTimeSpent,
  DeleteTask,
  LoadTaskState,
  MoveSubTask,
  MoveSubTaskDown,
  MoveSubTaskUp,
  MoveToArchive,
  MoveToOtherProject,
  RemoveTaskReminder,
  RemoveTimeSpent,
  RestoreTask,
  RoundTimeSpentForDay,
  SetCurrentTask,
  SetSelectedTask,
  ToggleStart,
  ToggleTaskShowSubTasks,
  UnsetCurrentTask,
  UpdateTask,
  UpdateTaskReminder,
  UpdateTaskTags,
  UpdateTaskUi
} from './store/task.actions';
import {initialTaskState} from './store/task.reducer';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {IssueProviderKey} from '../issue/issue.model';
import {TimeTrackingService} from '../time-tracking/time-tracking.service';
import {
  selectAllRepeatableTaskWithSubTasks,
  selectAllRepeatableTaskWithSubTasksFlat,
  selectAllTasks,
  selectCurrentTask,
  selectCurrentTaskId,
  selectCurrentTaskOrParentWithData,
  selectIsTaskDataLoaded,
  selectMainTasksWithoutTag,
  selectScheduledTasks,
  selectSelectedTask,
  selectSelectedTaskId,
  selectTaskAdditionalInfoTargetPanel,
  selectTaskById,
  selectTaskByIdWithSubTaskData,
  selectTaskFeatureState,
  selectTasksById,
  selectTasksByRepeatConfigId,
  selectTasksByTag,
  selectTaskWithSubTasksByRepeatConfigId
} from './store/task.selectors';
import {stringToMs} from '../../ui/duration/string-to-ms.pipe';
import {getWorklogStr} from '../../util/get-work-log-str';
import {Actions} from '@ngrx/effects';
import {ProjectService} from '../project/project.service';
import {RoundTimeOption} from '../project/project.model';
import {TagService} from '../tag/tag.service';
import {MY_DAY_TAG} from '../tag/tag.const';
import {WorkContextService} from '../work-context/work-context.service';
import {WorkContextType} from '../work-context/work-context.model';
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
  moveTaskUpInTodayList
} from '../work-context/store/work-context-meta.actions';
import {Router} from '@angular/router';


@Injectable({
  providedIn: 'root',
})
export class TaskService {
  // Currently used in idle service
  currentTaskId: string;
  currentTaskId$: Observable<string> = this._store.pipe(
    select(selectCurrentTaskId),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  currentTask$: Observable<Task> = this._store.pipe(
    select(selectCurrentTask),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  selectedTaskId$: Observable<string> = this._store.pipe(
    select(selectSelectedTaskId),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  selectedTask$: Observable<TaskWithSubTasks> = this._store.pipe(
    select(selectSelectedTask),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  taskAdditionalInfoTargetPanel$: Observable<TaskAdditionalInfoTargetPanel> = this._store.pipe(
    select(selectTaskAdditionalInfoTargetPanel),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  currentTaskOrCurrentParent$: Observable<TaskWithSubTasks> = this._store.pipe(
    select(selectCurrentTaskOrParentWithData),
    // NOTE: we can't use share here, as we need the last emitted value
  );


  allRepeatableTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(
    select(selectAllRepeatableTaskWithSubTasks),
  );

  allRepeatableTasksFlat$: Observable<TaskWithSubTasks[]> = this._store.pipe(
    select(selectAllRepeatableTaskWithSubTasksFlat),
  );

  scheduledTasksWOData$ = this._store.pipe(
    select(selectScheduledTasks),
  );

  isTaskDataLoaded$: Observable<boolean> = this._store.pipe(
    select(selectIsTaskDataLoaded),
  );

  taskFeatureState$: Observable<TaskState> = this._store.pipe(
    select(selectTaskFeatureState),
  );


  // META FIELDS
  // -----------
  currentTaskProgress$: Observable<number> = this.currentTask$.pipe(
    map((task) => task && task.timeEstimate > 0 && task.timeSpent / task.timeEstimate)
  );

  private _allTasksWithSubTaskData$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectAllTasks));


  getAllParentWithoutTag$(tagId: string) {
    return this._store.pipe(select(selectMainTasksWithoutTag, {tagId}));
  }

  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
    private readonly _tagService: TagService,
    private readonly _projectService: ProjectService,
    private readonly _workContextService: WorkContextService,
    private readonly _timeTrackingService: TimeTrackingService,
    private readonly _actions$: Actions,
    private readonly _router: Router,
  ) {
    this.currentTaskId$.subscribe((val) => this.currentTaskId = val);

    // time tracking
    this._timeTrackingService.tick$
      .pipe(withLatestFrom(this.currentTask$))
      .subscribe(([tick, currentTask]) => {
        if (currentTask) {
          this.addTimeSpent(currentTask, tick.duration, tick.date);
        }
      });
  }

  // META
  // ----
  setCurrentId(id: string) {
    if (id) {
      this._store.dispatch(new SetCurrentTask(id));
    } else {
      this._store.dispatch(new UnsetCurrentTask());
    }
  }

  setSelectedId(id: string, taskAdditionalInfoTargetPanel = TaskAdditionalInfoTargetPanel.Default) {
    this._store.dispatch(new SetSelectedTask({id, taskAdditionalInfoTargetPanel}));
  }

  startFirstStartable() {
    this._workContextService.startableTasks$.pipe(take(1)).subscribe(tasks => {
      if (tasks[0]) {
        this.setCurrentId(tasks[0].id);
      }
    });
  }

  async load() {
    const lsTaskState = await this._persistenceService.task.loadState();
    this.loadState(lsTaskState || initialTaskState);
  }


  loadState(state) {
    this._store.dispatch(new LoadTaskState({state}));
  }

  pauseCurrent() {
    this._store.dispatch(new UnsetCurrentTask());
  }

  // Tasks
  // -----
  add(title: string,
      isAddToBacklog = false,
      additionalFields: Partial<Task> = {},
      isAddToBottom = false,
  ) {
    const workContextId = this._workContextService.activeWorkContextId;
    const workContextType = this._workContextService.activeWorkContextType;

    this._store.dispatch(new AddTask({
      task: this.createNewTaskWithDefaults(title, additionalFields, workContextType, workContextId),
      workContextId,
      workContextType,
      isAddToBacklog,
      isAddToBottom
    }));
  }

  remove(task: TaskWithSubTasks) {
    this._store.dispatch(new DeleteTask({task}));
  }


  update(id: string, changedFields: Partial<Task>) {
    this._store.dispatch(new UpdateTask({
      task: {id, changes: this._shortSyntax(changedFields) as Partial<Task>}
    }));
  }

  updateTags(taskId: string, newTagIds: string[], oldTagIds: string[]) {
    this._store.dispatch(new UpdateTaskTags({taskId, newTagIds, oldTagIds}));
  }

  // TODO: Move logic away from service class (to actions)?
  // TODO: Should this reside in tagService?
  purgeUnusedTags(tagIds: string[]) {
    tagIds.forEach(tagId => {
      this.getTasksByTag(tagId)
        .pipe(take(1))
        .subscribe(tasks => {
          console.log(`Tag is present on ${tasks.length} tasks => ${tasks.length ? 'keeping...' : 'deleting...'}`);
          if (tasks.length === 0 && tagId !== MY_DAY_TAG.id) {
            this._tagService.removeTag(tagId);
          }
        });
    });
  }

  updateUi(id: string, changes: Partial<Task>) {
    this._store.dispatch(new UpdateTaskUi({
      task: {id, changes}
    }));
  }

  move(taskId: string,
       src: DropListModelSource,
       target: DropListModelSource,
       newOrderedIds: string[]) {
    const isSrcTodayList = (src === 'DONE' || src === 'UNDONE');
    const isTargetTodayList = (target === 'DONE' || target === 'UNDONE');
    const workContextId = this._workContextService.activeWorkContextId;

    if (isSrcTodayList && isTargetTodayList) {
      // move inside today
      const workContextType = this._workContextService.activeWorkContextType;
      this._store.dispatch(moveTaskInTodayList({taskId, newOrderedIds, src, target, workContextId, workContextType}));

    } else if (src === 'BACKLOG' && target === 'BACKLOG') {
      // move inside backlog
      this._store.dispatch(moveTaskInBacklogList({taskId, newOrderedIds, workContextId}));

    } else if (src === 'BACKLOG' && isTargetTodayList) {
      // move from backlog to today
      this._store.dispatch(moveTaskToTodayList({taskId, newOrderedIds, workContextId}));

    } else if (isSrcTodayList && target === 'BACKLOG') {
      // move from today to backlog
      this._store.dispatch(moveTaskToBacklogList({taskId, newOrderedIds, workContextId}));

    } else {
      // move sub task
      this._store.dispatch(new MoveSubTask({taskId, srcTaskId: src, targetTaskId: target, newOrderedIds}));
    }
  }

  moveUp(id: string, parentId: string = null, isBacklog: boolean) {
    if (parentId) {
      this._store.dispatch(new MoveSubTaskUp({id, parentId}));
    } else {

      const workContextId = this._workContextService.activeWorkContextId;
      const workContextType = this._workContextService.activeWorkContextType;

      if (isBacklog) {
        this._store.dispatch(moveTaskUpInBacklogList({taskId: id, workContextId}));
      } else {
        this._store.dispatch(moveTaskUpInTodayList({taskId: id, workContextType, workContextId}));
      }
    }
  }

  moveDown(id: string, parentId: string = null, isBacklog: boolean) {
    if (parentId) {
      this._store.dispatch(new MoveSubTaskDown({id, parentId}));
    } else {

      const workContextId = this._workContextService.activeWorkContextId;
      const workContextType = this._workContextService.activeWorkContextType;

      if (isBacklog) {
        this._store.dispatch(moveTaskDownInBacklogList({taskId: id, workContextId}));
      } else {
        this._store.dispatch(moveTaskDownInTodayList({taskId: id, workContextType, workContextId}));
      }
    }
  }

  addSubTaskTo(parentId) {
    this._store.dispatch(new AddSubTask({
      task: this.createNewTaskWithDefaults(''),
      parentId
    }));
  }

  addTimeSpent(task: Task,
               duration: number,
               date: string = getWorklogStr()) {
    this._store.dispatch(new AddTimeSpent({task, date, duration}));
  }

  removeTimeSpent(id: string,
                  duration: number,
                  date: string = getWorklogStr()) {
    this._store.dispatch(new RemoveTimeSpent({id, date, duration}));
  }

  focusTask(id: string) {
    document.getElementById('t-' + id).focus();
  }

  moveToToday(id, isMoveToTop = false) {
    const workContextId = this._workContextService.activeWorkContextId;
    const workContextType = this._workContextService.activeWorkContextType;
    if (workContextType === WorkContextType.PROJECT) {
      this._store.dispatch(moveTaskToTodayListAuto({taskId: id, isMoveToTop, workContextId}));
    }
  }

  moveToBacklog(id) {
    const workContextId = this._workContextService.activeWorkContextId;
    const workContextType = this._workContextService.activeWorkContextType;
    if (workContextType === WorkContextType.PROJECT) {
      this._store.dispatch(moveTaskToBacklogListAuto({taskId: id, workContextId}));
    }
  }

  moveToArchive(tasks: TaskWithSubTasks | TaskWithSubTasks[]) {
    if (!Array.isArray(tasks)) {
      tasks = [tasks];
    }
    this._store.dispatch(new MoveToArchive({tasks}));
  }

  moveToProject(task: TaskWithSubTasks, projectId: string) {
    if (!!task.parentId || !!task.issueId) {
      throw new Error('Wrong task model');
    }
    this._store.dispatch(new MoveToOtherProject({task, targetProjectId: projectId}));
  }

  toggleStartTask() {
    this._store.dispatch(new ToggleStart());
  }

  restoreTask(task: Task, subTasks: Task[]) {
    this._store.dispatch(new RestoreTask({task, subTasks}));
  }

  roundTimeSpentForDay(day: string, taskIds: string[], roundTo: RoundTimeOption, isRoundUp = false) {
    this._store.dispatch(new RoundTimeSpentForDay({day, taskIds, roundTo, isRoundUp}));
  }

  startTaskFromOtherContext$(taskId: string, workContextType: WorkContextType, workContextId: string): Observable<any> {
    const base = (workContextType === WorkContextType.TAG ? 'tag' : 'project');
    this._router.navigate([`/${base}/${workContextId}/tasks`]);
    // NOTE: route is the only mechanism to trigger this
    // this._workContextService._setActiveContext(workContextId, workContextType);

    const contextChanged$ = this._workContextService.activeWorkContextId$.pipe(
      filter(id => id === workContextId),
      // wait for actual data to be loaded
      switchMap(() => this._workContextService.activeWorkContext$),
      // dirty dirty fix
      delay(50),
      first(),
      )
    ;
    const task$ = contextChanged$.pipe(
      switchMap(() => this.getById$(taskId)),
      take(1),
    );

    if (workContextType === WorkContextType.PROJECT) {
      task$.subscribe(task => {
        if (task.parentId) {
          this.moveToToday(task.parentId, true);
        } else {
          this.moveToToday(task.id, true);
        }
        this.setCurrentId(task.id);
      });
      return task$;
    } else if (workContextType === WorkContextType.TAG) {
      task$.subscribe(task => {
        this.setCurrentId(task.id);
      });
    } else {
      throw new Error('Äh no');
    }
    return task$;
  }

  // REMINDER
  // --------
  addReminder(taskId: string, remindAt: number, title: string, isMoveToBacklog = false) {
    this._store.dispatch(new AddTaskReminder({id: taskId, remindAt, title, isMoveToBacklog}));
  }

  updateReminder(taskId: string, reminderId: string, remindAt: number, title: string) {
    this._store.dispatch(new UpdateTaskReminder({id: taskId, reminderId, remindAt, title}));
  }

  removeReminder(taskId: string, reminderId: string) {
    this._store.dispatch(new RemoveTaskReminder({id: taskId, reminderId}));
  }

  // HELPER
  // ------
  getById$(id: string): Observable<Task> {
    return this._store.pipe(select(selectTaskById, {id}), take(1));
  }

  getByIdLive$(id: string): Observable<Task> {
    return this._store.pipe(select(selectTaskById, {id}));
  }

  getByIdsLive$(ids: string[]): Observable<Task[]> {
    return this._store.pipe(select(selectTasksById, {ids}));
  }

  getByIdWithSubTaskData$(id: string): Observable<TaskWithSubTasks> {
    return this._store.pipe(select(selectTaskByIdWithSubTaskData, {id}), take(1));
  }

  getTasksByRepeatCfgId$(repeatCfgId: string): Observable<Task[]> {
    return this._store.pipe(select(selectTasksByRepeatConfigId, {repeatCfgId}), take(1));
  }

  getTasksWithSubTasksByRepeatCfgId$(repeatCfgId: string): Observable<TaskWithSubTasks[]> {
    return this._store.pipe(select(selectTaskWithSubTasksByRepeatConfigId, {repeatCfgId}));
  }

  getTasksByTag(tagId: string): Observable<TaskWithSubTasks[]> {
    return this._store.pipe(select(selectTasksByTag, {tagId}));
  }

  setDone(id: string) {
    this.update(id, {isDone: true});
  }

  markIssueUpdatesAsRead(id: string) {
    this.update(id, {issueWasUpdated: false});
  }

  setUnDone(id: string) {
    this.update(id, {isDone: false});
  }

  showSubTasks(id: string) {
    this.updateUi(id, {_showSubTasksMode: ShowSubTasksMode.Show});
  }

  toggleSubTaskMode(taskId: string, isShowLess = true, isEndless = false) {
    this._store.dispatch(new ToggleTaskShowSubTasks({taskId, isShowLess, isEndless}));
  }

  hideSubTasks(id: string) {
    this.updateUi(id, {_showSubTasksMode: ShowSubTasksMode.HideAll});
  }

  // GLOBAL TASK MODEL STUFF
  // -----------------------

  // BEWARE: does only work for task model updates
  async updateEverywhereForCurrentProject(id: string, changedFields: Partial<Task>) {
    const state = await this.taskFeatureState$.pipe(first()).toPromise();
    const {entities} = state;
    if (entities[id]) {
      this.update(id, changedFields);
    } else {
      await this.updateArchiveTask(id, changedFields);
    }
  }

  // BEWARE: does only work for task model updates, but not the meta models
  async updateArchiveTask(id: string, changedFields: Partial<Task>): Promise<any> {
    return await this._persistenceService.taskArchive.execAction(new UpdateTask({
      task: {id, changes: this._shortSyntax(changedFields) as Partial<Task>}
    }));
  }

  async getByIdFromEverywhere(id: string): Promise<Task> {
    return await this._persistenceService.task.getById(id)
      || await this._persistenceService.taskArchive.getById(id);
  }

  async getAllTasksForCurrentProject(): Promise<Task[]> {
    const allTasks = await this._allTasksWithSubTaskData$.pipe(first()).toPromise();
    const archiveTaskState: TaskArchive = await this._persistenceService.taskArchive.loadState();
    const ids = archiveTaskState && archiveTaskState.ids as string[] || [];
    const archiveTasks = ids
      .map(id => archiveTaskState.entities[id])
      .filter(task => task.projectId === this._projectService.currentId);
    return [...allTasks, ...archiveTasks].filter(
      task => task.projectId === this._workContextService.activeWorkContextId
    );
  }

  async getAllIssueIdsForCurrentProject(issueProviderKey: IssueProviderKey): Promise<string[] | number[]> {
    const allTasks = await this.getAllTasksForCurrentProject();
    return allTasks
      .filter(task => task.issueType === issueProviderKey)
      .map(task => task.issueId);
  }

  // TODO check with new archive
  async checkForTaskWithIssue(issueId: string | number): Promise<{
    task: Task,
    subTasks: Task[],
    isFromArchive: boolean,
  }> {
    throw new Error('NOT IMPLEMENT');
    // TODO fix
    return null;
    const allTasks = await this._allTasksWithSubTaskData$.pipe(first()).toPromise() as Task[];
    const taskWithSameIssue: Task = allTasks.find(task => task.issueId === issueId);

    if (taskWithSameIssue) {
      return {
        task: taskWithSameIssue,
        isFromArchive: false,
        subTasks: null,
      };
    } else {
      const archiveTaskState: TaskArchive = await this._persistenceService.taskArchive.loadState();
      const ids = archiveTaskState && archiveTaskState.ids as string[];
      if (ids) {
        const archiveTaskWithSameIssue = ids.map(id => archiveTaskState.entities[id]).find(task => task.issueId === issueId);
        return archiveTaskWithSameIssue && {
          task: archiveTaskWithSameIssue,
          subTasks: archiveTaskWithSameIssue.subTaskIds && archiveTaskWithSameIssue.subTaskIds.map(id => archiveTaskState.entities[id]),
          isFromArchive: true
        };
      }
    }
  }


  createNewTaskWithDefaults(
    title: string,
    additional: Partial<Task> = {},
    workContextType: WorkContextType = this._workContextService.activeWorkContextType,
    workContextId: string = this._workContextService.activeWorkContextId
  ): Task {
    return this._shortSyntax({
      // NOTE needs to be created every time
      ...DEFAULT_TASK,
      created: Date.now(),
      title,
      id: shortid(),

      projectId: (workContextType === WorkContextType.PROJECT)
        ? workContextId
        : null,
      tagIds: (workContextType === WorkContextType.TAG && !additional.parentId)
        ? [workContextId]
        : [],

      ...additional,
    }) as Task;
  }

  // NOTE: won't be static once we check for the settings
  private _shortSyntax(task: Task | Partial<Task>): Task | Partial<Task> {
    if (!task.title) {
      return task;
    }
    const matches = SHORT_SYNTAX_REG_EX.exec(task.title);

    if (matches && matches.length >= 3) {
      const full = matches[0];
      const timeSpent = matches[2];
      const timeEstimate = matches[4];

      return {
        ...task,
        ...(
          timeSpent
            ? {
              timeSpentOnDay: {
                ...(task.timeSpentOnDay || {}),
                [getWorklogStr()]: stringToMs(timeSpent)
              }
            }
            : {}
        ),
        timeEstimate: stringToMs(timeEstimate),
        title: task.title.replace(full, '')
      };

    } else {
      return task;
    }
  }
}
