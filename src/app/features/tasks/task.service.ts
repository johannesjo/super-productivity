import shortid from 'shortid';
import {filter, first, map, switchMap, take, withLatestFrom} from 'rxjs/operators';
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
  MoveDown,
  MoveToArchive,
  MoveToBacklog,
  MoveToOtherProject,
  MoveToToday,
  MoveUp,
  RemoveTaskReminder,
  RemoveTimeSpent,
  RestoreTask,
  RoundTimeSpentForDay,
  SetCurrentTask,
  SetSelectedTask,
  StartFirstStartable,
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
  selectScheduledTasks,
  selectSelectedTask,
  selectSelectedTaskId,
  selectTaskAdditionalInfoTargetPanel,
  selectTaskById,
  selectTaskByIdWithSubTaskData,
  selectTasksByRepeatConfigId,
  selectTasksByTag,
  selectTasksWorkedOnOrDoneFlat,
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
import {moveTaskInBacklogList, moveTaskInTodayList} from '../work-context/store/work-context-meta.actions';


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


  // META FIELDS
  // -----------
  currentTaskProgress$: Observable<number> = this.currentTask$.pipe(
    map((task) => task && task.timeEstimate > 0 && task.timeSpent / task.timeEstimate)
  );

  private _allTasksWithSubTaskData$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectAllTasks));


  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
    private readonly _tagService: TagService,
    private readonly _projectService: ProjectService,
    private readonly _workContextService: WorkContextService,
    private readonly _timeTrackingService: TimeTrackingService,
    private readonly _actions$: Actions,
  ) {
    this.currentTaskId$.subscribe((val) => this.currentTaskId = val);

    // time tracking
    this._timeTrackingService.tick$
      .pipe(withLatestFrom(this.currentTaskId$))
      .subscribe(([tick, currentId]) => {
        if (currentId) {
          this.addTimeSpent(currentId, tick.duration, tick.date);
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

  startFirstStartable(isStartIfHasCurrent = false) {
    this._store.dispatch(new StartFirstStartable({isStartIfHasCurrent}));
  }

  async load() {
    const lsTaskState = await this._persistenceService.task.loadState();
    // this.loadState(lsTaskState || initialTaskState);
    console.log('LOAD TASK BASIC');

    this.loadState(
      lsTaskState
        ? {
          ...lsTaskState,
          backlogTaskIds: [],
          todaysTaskIds: []
        }
        : initialTaskState
    );
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
    this.removeTags(task, task.tagIds);
    this._store.dispatch(new DeleteTask({task}));
  }


  update(id: string, changedFields: Partial<Task>) {
    this._store.dispatch(new UpdateTask({
      task: {id, changes: this._shortSyntax(changedFields) as Partial<Task>}
    }));
  }

  // NOTE: side effects are not executed!!!
  updateForProject(id: string, projectId: string, changedFields: Partial<Task>) {
    console.log('NOT IMPLEMENT');
    // TODO fix
    return null;

    // if (projectId === this._projectService.currentId) {
    //   this._store.dispatch(new UpdateTask({
    //     task: {id, changes: this._shortSyntax(changedFields) as Partial<Task>}
    //   }));
    // } else {
    //   this._persistenceService.task.update(projectId, (state) => {
    //     const task = state.entities[id];
    //     state.entities[id] = {...task, ...changedFields};
    //     return state;
    //   });
    // }
  }

  updateTags(taskId: string, newTagIds: string[], oldTagIds: string[]) {
    this._store.dispatch(new UpdateTaskTags({taskId, newTagIds, oldTagIds}));
  }

  // TODO: Move logic away from service class (to actions)?
  removeTags(task: Task, tagIdsToRemove: string[]) {
    const newTags = task.tagIds.filter(tagId => !tagIdsToRemove.includes(tagId));
    this.updateTags(task.id, newTags, task.tagIds);
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
    // Task
    // if (src === 'DONE' && target === 'UNDONE') {
    // TODO via effect this.setUnDone(taskId);
    // } else if (src === 'UNDONE' && target === 'DONE') {
    // TODO via effect this.setDone(taskId);
    // }

    // List
    const isSrcTodayList = (src === 'DONE' || src === 'UNDONE');
    const isTargetTodayList = (target === 'DONE' || target === 'UNDONE');

    if (isSrcTodayList && isTargetTodayList) {
      // move inside today
      const workContextId = this._workContextService.activeWorkContextId;
      const workContextType = this._workContextService.activeWorkContextType;
      this._store.dispatch(moveTaskInTodayList({taskId, newOrderedIds, src, target, workContextId, workContextType}));
    } else if (src === 'BACKLOG' && target === 'BACKLOG') {
      this._store.dispatch(moveTaskInBacklogList({taskId, newOrderedIds}));
      // move inside backlog
    } else if (src === 'BACKLOG' && isTargetTodayList) {
      // move from backlog to today
    } else if (isSrcTodayList && target === 'BACKLOG') {
      // move from today to backlog
    } else {
      // move sub task
    }

    // TODO unset current via effect
  }

  moveUp(id: string) {
    this._store.dispatch(new MoveUp({id}));
  }

  moveDown(id: string) {
    this._store.dispatch(new MoveDown({id}));
  }

  addSubTaskTo(parentId) {
    this._store.dispatch(new AddSubTask({
      task: this.createNewTaskWithDefaults(''),
      parentId
    }));
  }

  addTimeSpent(id: string,
               duration: number,
               date: string = getWorklogStr()) {
    this._store.dispatch(new AddTimeSpent({id, date, duration}));
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
    this._store.dispatch(new MoveToToday({id, isMoveToTop}));
  }

  moveToBacklog(id) {
    this._store.dispatch(new MoveToBacklog({id}));
  }

  moveToArchive(tasks: TaskWithSubTasks | TaskWithSubTasks[]) {
    if (!Array.isArray(tasks)) {
      tasks = [tasks];
    }
    this._store.dispatch(new MoveToArchive({tasks}));
  }

  moveToProject(tasks: TaskWithSubTasks | TaskWithSubTasks[], projectId: string) {
    if (!Array.isArray(tasks)) {
      tasks = [tasks];
    }
    if (tasks.find((task) => !!task.parentId || !!task.issueId)) {
      console.error('Wrong task model');
      return;
    }
    this._store.dispatch(new MoveToOtherProject({tasks, projectId}));
  }

  toggleStartTask() {
    this._store.dispatch(new ToggleStart());
  }

  restoreTask(task: Task, subTasks: Task[]) {
    this._store.dispatch(new RestoreTask({task, subTasks}));
  }

  roundTimeSpentForDay(day: string, roundTo: RoundTimeOption, isRoundUp = false) {
    this._store.dispatch(new RoundTimeSpentForDay({day, roundTo, isRoundUp}));
  }

  // TODO this should be done via action and effects
  startTaskFromOtherProject$(taskId: string, projectId: string): Observable<Task> {
    this._projectService.setCurrentId(projectId);

    const taskInOtherProject$ = this._projectService.isRelatedDataLoadedForCurrentProject$.pipe(
      filter(isLoaded => !!isLoaded),
      switchMap(() => this.getById$(taskId).pipe(
        take(1))
      ),
      take(1),
    );

    taskInOtherProject$.subscribe(task => {
      if (task.parentId) {
        this.moveToToday(task.parentId, true);
      } else {
        this.moveToToday(task.id, true);
      }
      this.setCurrentId(task.id);
    });
    return taskInOtherProject$;
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

  getByIdWithSubTaskData$(id: string): Observable<TaskWithSubTasks> {
    return this._store.pipe(select(selectTaskByIdWithSubTaskData, {id}), take(1));
  }

  getTasksByRepeatCfgId$(repeatCfgId: string): Observable<Task[]> {
    return this._store.pipe(select(selectTasksByRepeatConfigId, {repeatCfgId}), take(1));
  }

  getTasksWithSubTasksByRepeatCfgId$(repeatCfgId: string): Observable<TaskWithSubTasks[]> {
    return this._store.pipe(select(selectTaskWithSubTasksByRepeatConfigId, {repeatCfgId}));
  }

  getTasksWorkedOnOrDoneFlat$(day: string = getWorklogStr()): Observable<TaskWithSubTasks[]> {
    return this._store.pipe(select(selectTasksWorkedOnOrDoneFlat, {day}));
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
    console.log('NOT IMPLEMENT');
    // TODO fix
    return null;

    // const entities = await this.taskEntityState$.pipe(first()).toPromise();
    // if (entities[id]) {
    //   this.update(id, changedFields);
    // } else {
    //   await this.updateArchiveTaskForCurrentProject(id, changedFields);
    // }
  }

  // BEWARE: does only work for task model updates, but not the meta models
  async updateArchiveTaskForCurrentProject(id: string, changedFields: Partial<Task>): Promise<any> {
    console.log('NOT IMPLEMENT');
    // TODO fix
    return null;
    // const curProId = this._projectService.currentId;
    // return await this._persistenceService.taskArchive.ent.execAction(curProId, new UpdateTask({
    //   task: {id, changes: this._shortSyntax(changedFields) as Partial<Task>}
    // }));
  }

  async getByIdFromEverywhere(id: string, projectId: string = this._projectService.currentId): Promise<Task> {
    console.log('NOT IMPLEMENT');
    // TODO fix
    return null;
    // return await this._persistenceService.task.ent.getById(projectId, id)
    //   || await this._persistenceService.taskArchive.ent.getById(projectId, id);
  }

  // NOTE: archived tasks not included
  async getByIdsForProject(taskIds: string[], projectId: string): Promise<Task[]> {
    console.log('NOT IMPLEMENT');
    // TODO fix
    return [];

    // return await this._persistenceService.task.ent.getByIds(projectId, taskIds);
  }

  // NOTE: archived tasks not included
  // TODO think about getting data from current project directly from store
  async getByIdsFromAllProjects(projectIdTaskMap: { [key: string]: string[] }): Promise<Task[]> {
    console.log('NOT IMPLEMENT');
    // TODO fix
    return [];

    const projectIds = Object.keys(projectIdTaskMap);
    const taskData = await Promise.all(projectIds.map(async (projectId) => {
      return this.getByIdsForProject(projectIdTaskMap[projectId], projectId);
    }));

    if (taskData) {
      return taskData.reduce((acc, val) => acc.concat(val), []);
    }
    return null;
  }

  // TODO check if that is what we need
  async getAllTasksForCurrentProject(): Promise<Task[]> {
    console.log('NOT IMPLEMENT');
    // TODO fix
    return [];
    const allTasks = await this._allTasksWithSubTaskData$.pipe(first()).toPromise();
    const archiveTaskState: TaskArchive = await this._persistenceService.taskArchive.loadState();
    const ids = archiveTaskState && archiveTaskState.ids as string[] || [];
    const archiveTasks = ids
      .map(id => archiveTaskState.entities[id])
      .filter(task => task.projectId === this._projectService.currentId);
    return [...allTasks, ...archiveTasks];
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
    console.log('NOT IMPLEMENT');
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
