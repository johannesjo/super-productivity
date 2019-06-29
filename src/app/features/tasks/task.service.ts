import shortid from 'shortid';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  first,
  map,
  shareReplay,
  switchMap,
  take,
  withLatestFrom
} from 'rxjs/operators';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
  DEFAULT_TASK,
  DropListModelSource,
  HIDE_SUB_TASKS,
  SHOW_SUB_TASKS,
  Task,
  TaskWithIssueData,
  TaskWithSubTasks
} from './task.model';
import {select, Store} from '@ngrx/store';
import {
  AddSubTask,
  AddTask,
  AddTaskReminder,
  AddTimeSpent,
  DeleteTask,
  FocusLastActiveTask,
  FocusTask,
  LoadTaskState,
  Move,
  MoveDown,
  MoveToArchive,
  MoveToBacklog,
  MoveToToday,
  MoveUp,
  RemoveTaskReminder,
  RemoveTimeSpent,
  RestoreTask,
  RoundTimeSpentForDay,
  SetCurrentTask,
  StartFirstStartable,
  TaskActionTypes,
  ToggleStart,
  ToggleTaskShowSubTasks,
  UnsetCurrentTask,
  UpdateTask,
  UpdateTaskReminder,
  UpdateTaskUi
} from './store/task.actions';
import {initialTaskState, taskReducer, TaskState,} from './store/task.reducer';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {IssueData, IssueProviderKey} from '../issue/issue';
import {TimeTrackingService} from '../time-tracking/time-tracking.service';
import {
  selectAllTasksWithIssueData,
  selectBacklogTasksWithSubTasks,
  selectCurrentTask,
  selectCurrentTaskId,
  selectCurrentTaskOrParentWithData,
  selectEstimateRemainingForBacklog,
  selectEstimateRemainingForToday,
  selectFocusTaskId,
  selectHasTasksToWorkOn,
  selectIsTaskDataLoaded,
  selectIsTaskForTodayPlanned,
  selectScheduledTasks,
  selectStartableTaskIds,
  selectStartableTasks,
  selectTaskById,
  selectTaskByIssueId,
  selectTaskEntities,
  selectTasksWithMissingIssueData,
  selectTasksWorkedOnOrDoneFlat,
  selectTodaysDoneTasksWithSubTasks,
  selectTodaysTasksWithSubTasks,
  selectTodaysUnDoneTasksWithSubTasks,
  selectTotalTimeWorkedOnTodaysTasks
} from './store/task.selectors';
import {stringToMs} from '../../ui/duration/string-to-ms.pipe';
import {getWorklogStr} from '../../util/get-work-log-str';
import {Actions, ofType} from '@ngrx/effects';
import {IssueService} from '../issue/issue.service';
import {ProjectService} from '../project/project.service';
import {SnackService} from '../../core/snack/snack.service';
import {RoundTimeOption} from '../project/project.model';
import {Dictionary} from '@ngrx/entity';
import {GITHUB_TYPE, LEGACY_GITHUB_TYPE} from '../issue/issue.const';


@Injectable({
  providedIn: 'root',
})
export class TaskService {
  isDataLoaded$: Observable<boolean> = this._store.pipe(
    select(selectIsTaskDataLoaded),
  );

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

  currentTaskOrCurrentParent$: Observable<Task> = this._store.pipe(
    select(selectCurrentTaskOrParentWithData),
    // NOTE: we can't use share here, as we need the last emitted value
  );


  startableTaskIds$: Observable<string[]> = this._store.pipe(
    select(selectStartableTaskIds),
    distinctUntilChanged(),
  );

  startableTasks$: Observable<Task[]> = this._store.pipe(
    select(selectStartableTasks),
    distinctUntilChanged(),
  );

  // todays list flat + tasks worked on today
  taskEntityState$: Observable<Dictionary<Task>> = this._store.pipe(
    select(selectTaskEntities),
  );

  // only todays list
  todaysTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(
    select(selectTodaysTasksWithSubTasks),
    distinctUntilChanged(),
    shareReplay(),
  );

  isTasksForToday$: Observable<boolean> = this._store.pipe(
    select(selectIsTaskForTodayPlanned),
  );

  backlogTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(
    select(selectBacklogTasksWithSubTasks),
    distinctUntilChanged(),
    shareReplay(),
  );
  undoneTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(
    select(selectTodaysUnDoneTasksWithSubTasks),
    distinctUntilChanged(),
    shareReplay(),
  );

  doneTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(
    select(selectTodaysDoneTasksWithSubTasks),
    distinctUntilChanged(),
    shareReplay(),
  );

  focusTaskId$: Observable<string> = this._store.pipe(
    select(selectFocusTaskId),
    distinctUntilChanged(),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  scheduledTasksWOData$ = this._store.pipe(
    select(selectScheduledTasks),
    distinctUntilChanged(),
  );


  // META FIELDS
  // -----------
  estimateRemainingToday$: Observable<number> = this._store.pipe(
    select(selectEstimateRemainingForToday),
    distinctUntilChanged(),
  );
  estimateRemainingBacklog$: Observable<number> = this._store.pipe(
    select(selectEstimateRemainingForBacklog),
    distinctUntilChanged(),
  );

  totalTimeWorkedOnTodaysTasks$: Observable<any> = this._store.pipe(
    select(selectTotalTimeWorkedOnTodaysTasks),
    distinctUntilChanged(),
  );
  currentTaskProgress$: Observable<number> = this.currentTask$.pipe(
    map((task) => task && task.timeEstimate > 0 && task.timeSpent / task.timeEstimate)
  );

  // TODO could be done as a dynamic selector
  workingToday$: Observable<any> = this.getTimeWorkedForDay$(getWorklogStr());

  // TODO could be done as a dynamic selector
  estimatedOnTasksWorkedOnToday$: Observable<number> = this.todaysTasks$.pipe(
    map((tasks) => {
      const date = getWorklogStr();
      return tasks && tasks.length && tasks.reduce((acc, task) => {
          if (!task.timeSpentOnDay && !(task.timeSpentOnDay[date] > 0)) {
            return acc;
          }
          const remainingEstimate = task.timeEstimate + (task.timeSpentOnDay[date]) - task.timeSpent;
          return (remainingEstimate > 0)
            ? acc + remainingEstimate
            : acc;
        }, 0
      );
    }),
    distinctUntilChanged(),
  );


  tasksWithMissingIssueData$: Observable<TaskWithIssueData[]> = this._store.pipe(
    // wait for issue model to be loaded
    debounceTime(1000),
    select(selectTasksWithMissingIssueData),
    distinctUntilChanged(),
    shareReplay(),
  );

  onMoveToBacklog$: Observable<any> = this._actions$.pipe(ofType(
    TaskActionTypes.MoveToBacklog,
  ));

  isHasTasksToWorkOn$: Observable<boolean> = this._store.pipe(
    select(selectHasTasksToWorkOn),
    distinctUntilChanged(),
  );


  private _allTasksWithIssueData$: Observable<TaskWithIssueData[]> = this._store.pipe(select(selectAllTasksWithIssueData));


  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
    private readonly _issueService: IssueService,
    private readonly _projectService: ProjectService,
    private readonly _snackService: SnackService,
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

  startFirstStartable() {
    this._store.dispatch(new StartFirstStartable());
  }

  async loadStateForProject(projectId) {
    const lsTaskState = await this._persistenceService.task.load(projectId);
    if (lsTaskState) {
      this._replaceLegacyGitType(lsTaskState);
    }
    this.loadState(lsTaskState || initialTaskState);
  }

  loadState(state) {
    this._store.dispatch(new LoadTaskState({state}));
  }

  pauseCurrent() {
    this._store.dispatch(new UnsetCurrentTask);
  }

  // Tasks
  // -----
  add(title: string,
      isAddToBacklog = false,
      additionalFields?: Partial<Task>,
      isAddToBottom = false,
  ) {
    this._store.dispatch(new AddTask({
      task: this._createNewTask(title, additionalFields),
      isAddToBacklog,
      isAddToBottom
    }));
  }

  addWithIssue(title: string,
               issueType: IssueProviderKey,
               issue: IssueData,
               isAddToBacklog = false,
               isAddToBottom = false,
  ) {
    this._store.dispatch(new AddTask({
      task: this._createNewTask(title, {
        issueId: issue && issue.id as string,
        issueType: issueType,
      }),
      issue,
      isAddToBacklog,
      isAddToBottom,
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


  updateUi(id: string, changes: Partial<Task>) {
    this._store.dispatch(new UpdateTaskUi({
      task: {id, changes}
    }));
  }

  move(taskId: string,
       sourceModelId: DropListModelSource,
       targetModelId: DropListModelSource,
       newOrderedIds: string[]) {
    this._store.dispatch(new Move({
      taskId,
      sourceModelId,
      targetModelId,
      newOrderedIds,
    }));
  }

  moveUp(id: string) {
    this._store.dispatch(new MoveUp({id}));
  }

  moveDown(id: string) {
    this._store.dispatch(new MoveDown({id}));
  }

  addSubTaskTo(parentId) {
    this._store.dispatch(new AddSubTask({
      task: this._createNewTask(''),
      parentId: parentId
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
    this._store.dispatch(new FocusTask({id}));
  }

  focusLastActiveTask() {
    this._store.dispatch(new FocusLastActiveTask());
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

  toggleStartTask() {
    this._store.dispatch(new ToggleStart());
  }

  restoreTask(task: TaskWithSubTasks) {
    this._store.dispatch(new RestoreTask({task}));
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

  getTasksWorkedOnOrDoneFlat$(day: string = getWorklogStr()): Observable<TaskWithSubTasks[]> {
    return this._store.pipe(select(selectTasksWorkedOnOrDoneFlat, {day}));
  }

  // TODO could be done better
  getTimeWorkedForDay$(day: string = getWorklogStr()): Observable<number> {
    return this.todaysTasks$.pipe(
      map((tasks) => {
        return tasks && tasks.length && tasks.reduce((acc, task) => {
            return acc + (
              (task.timeSpentOnDay && +task.timeSpentOnDay[day])
                ? +task.timeSpentOnDay[day]
                : 0
            );
          }, 0
        );
      }),
      distinctUntilChanged(),
    );
  }

  // TODO could be done better
  getTimeEstimateForDay$(day: string = getWorklogStr()): Observable<number> {
    return this.todaysTasks$.pipe(
      map((tasks) => {
        return tasks && tasks.length && tasks.reduce((acc, task) => {
            if (!task.timeSpentOnDay && !(task.timeSpentOnDay[day] > 0)) {
              return acc;
            }
            const remainingEstimate = task.timeEstimate + (task.timeSpentOnDay[day]) - task.timeSpent;
            return (remainingEstimate > 0)
              ? acc + remainingEstimate
              : acc;
          }, 0
        );
      }),
      distinctUntilChanged(),
    );
  }


  getByIssueId$(issueId: string | number, issueType: IssueProviderKey): Observable<Task> {
    return this._store.pipe(select(selectTaskByIssueId, {issueId, issueType}), take(1));

  }


  setDone(id: string) {
    this.update(id, {isDone: true});
  }

  setUnDone(id: string) {
    this.update(id, {isDone: false});
  }

  showAdditionalInfoOpen(id: string) {
    this.updateUi(id, {_isAdditionalInfoOpen: true, _currentTab: 0});
  }

  hideAdditionalInfoOpen(id: string) {
    this.updateUi(id, {_isAdditionalInfoOpen: false});
  }

  showSubTasks(id: string) {
    this.updateUi(id, {_showSubTasksMode: SHOW_SUB_TASKS});
  }

  toggleSubTaskMode(taskId: string, isShowLess = true, isEndless = false) {
    this._store.dispatch(new ToggleTaskShowSubTasks({taskId, isShowLess, isEndless}));
  }

  hideSubTasks(id: string) {
    this.updateUi(id, {_showSubTasksMode: HIDE_SUB_TASKS});
  }

  // GLOBAL TASK MODEL STUFF
  // -----------------------

  // BEWARE: does only work for task model updates
  async updateEverywhereForCurrentProject(id: string, changedFields: Partial<Task>) {
    const entities = await this.taskEntityState$.pipe(first()).toPromise();
    if (entities[id]) {
      this.update(id, changedFields);
    } else {
      await this.updateArchiveTaskForCurrentProject(id, changedFields);
    }
  }

  // BEWARE: does only work for task model updates, but not the meta models
  async updateArchiveTaskForCurrentProject(id: string, changedFields: Partial<Task>) {
    const curProId = this._projectService.currentId;
    const archiveTaskState = await this._persistenceService.taskArchive.load(curProId) as TaskState;
    const updatedState = taskReducer(archiveTaskState, new UpdateTask({
      task: {id, changes: this._shortSyntax(changedFields) as Partial<Task>}
    }));
    await this._persistenceService.saveToTaskArchiveForProject(curProId, updatedState);
  }

  async getByIdFromEverywhere(id: string, projectId: string = this._projectService.currentId): Promise<Task> {
    const curProject = await this._persistenceService.task.load(projectId);
    if (curProject && curProject.entities[id]) {
      return curProject.entities[id];
    }

    const archive = await this._persistenceService.taskArchive.load(projectId);
    if (archive && archive.entities[id]) {
      return archive.entities[id];
    }

    return null;
  }

  // NOTE: archived tasks not included
  async getByIdsForProject(taskIds: string[], projectId: string): Promise<Task[]> {
    const taskState = await this._persistenceService.task.load(projectId);
    if (taskState && taskState.entities) {
      return taskIds
        .map(taskId => taskState.entities[taskId])
        .filter(task => !!task);
    }
    return null;
  }

  // NOTE: archived tasks not included
  async getByIdsFromAllProjects(projectIdTaskMap: { [key: string]: string[] }): Promise<Task[]> {
    const projectIds = Object.keys(projectIdTaskMap);
    const taskData = await Promise.all(projectIds.map(async (projectId) => {
      return this.getByIdsForProject(projectIdTaskMap[projectId], projectId);
    }));

    if (taskData) {
      return taskData.reduce((acc, val) => acc.concat(val), []);
    }
    return null;
  }

  async getAllTasksForCurrentProject(): Promise<TaskWithIssueData[]> {
    const allTasks = await this._allTasksWithIssueData$.pipe(first()).toPromise();
    const archiveTaskState = await this._persistenceService.taskArchive.load(this._projectService.currentId);
    const ids = archiveTaskState && archiveTaskState.ids as string[] || [];
    const archiveTasks = ids.map(id => archiveTaskState.entities[id]);
    return [...allTasks, ...archiveTasks];
  }

  async getAllIssueIdsForCurrentProject(issueProviderKey: IssueProviderKey): Promise<string[] | number[]> {
    const allTasks = await this.getAllTasksForCurrentProject();
    return allTasks
      .filter(task => task.issueType === issueProviderKey)
      .map(task => task.issueId);
  }

  async checkForTaskWithIssue(issue: IssueData): Promise<{
    task: TaskWithIssueData | TaskWithSubTasks,
    isFromArchive: boolean,
  }> {
    const allTasks = await this._allTasksWithIssueData$.pipe(first()).toPromise();
    const taskWithSameIssue: TaskWithIssueData = allTasks.find(task => task.issueId === issue.id);

    if (taskWithSameIssue) {
      return {task: taskWithSameIssue, isFromArchive: false};
    } else {
      const archiveTaskState = await this._persistenceService.taskArchive.load(this._projectService.currentId);
      const ids = archiveTaskState && archiveTaskState.ids as string[];
      if (ids) {
        const archiveTaskWithSameIssue = ids.map(id => archiveTaskState.entities[id]).find(task => task.issueId === issue.id);
        return archiveTaskWithSameIssue && {task: archiveTaskWithSameIssue, isFromArchive: true};
      }
    }
  }


  private _createNewTask(title: string, additional: Partial<Task> = {}): Task {
    return this._shortSyntax({
      // NOTE needs to be created every time
      ...DEFAULT_TASK,
      created: Date.now(),
      title,
      id: shortid(),
      ...additional,
    }) as Task;
  }

  // NOTE: won't be static once we check for the settings
  private _shortSyntax(task: Task | Partial<Task>): Task | Partial<Task> {
    if (!task.title) {
      return task;
    }
    const timeEstimateRegExp = / t?(([0-9]+(m|h|d)+)? *\/ *)?([0-9]+(m|h|d)+) *$/i;
    const matches = timeEstimateRegExp.exec(task.title);

    if (matches && matches.length >= 3) {
      let full;
      let timeSpent;
      let timeEstimate;
      full = matches[0];
      timeSpent = matches[2];
      timeEstimate = matches[4];

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

  // hacky but it should work
  private _replaceLegacyGitType(state: TaskState) {
    const ids = state.ids as string[];
    ids.forEach(id => {
      const task = state.entities[id] as any;
      const issueType = task.issueType as string;
      if (issueType === LEGACY_GITHUB_TYPE) {
        task.issueType = GITHUB_TYPE;
      }
    });
  }
}
