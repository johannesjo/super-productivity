import shortid from 'shortid';
import { debounceTime, delay, distinctUntilChanged, first, map, shareReplay, take, withLatestFrom } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DEFAULT_TASK, DropListModelSource, HIDE_SUB_TASKS, SHOW_SUB_TASKS, Task, TaskWithIssueData, TaskWithSubTasks } from './task.model';
import { select, Store } from '@ngrx/store';
import {
  AddSubTask,
  AddTask,
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
  RemoveTimeSpent,
  RestoreTask,
  SetCurrentTask,
  StartFirstStartable,
  TaskActionTypes,
  ToggleStart,
  ToggleTaskShowSubTasks,
  UnsetCurrentTask,
  UpdateTask,
  UpdateTaskUi
} from './store/task.actions';
import { initialTaskState, } from './store/task.reducer';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { IssueData, IssueProviderKey } from '../issue/issue';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';
import {
  selectAllTasksWithIssueData,
  selectBacklogTasksWithSubTasks,
  selectCurrentTask,
  selectCurrentTaskId,
  selectEstimateRemainingForBacklog,
  selectEstimateRemainingForToday,
  selectFocusTaskId,
  selectIsTaskDataLoaded,
  selectIsTaskForTodayPlanned,
  selectIsTriggerPlanningMode,
  selectStartableTaskIds,
  selectStartableTasks,
  selectTaskById,
  selectTasksWithMissingIssueData,
  selectTodaysDoneTasksWithSubTasks,
  selectTodaysTasksFlat,
  selectTodaysTasksWithSubTasks,
  selectTodaysUnDoneTasksWithSubTasks,
  selectTotalTimeWorkedOnTodaysTasks
} from './store/task.selectors';
import { stringToMs } from '../../ui/duration/string-to-ms.pipe';
import { getWorklogStr } from '../../util/get-work-log-str';
import { Actions, ofType } from '@ngrx/effects';
import { IssueService } from '../issue/issue.service';
import { ProjectService } from '../project/project.service';


@Injectable({
  providedIn: 'root',
})
export class TaskService {
  isDataLoaded$: Observable<boolean> = this._store.pipe(
    select(selectIsTaskDataLoaded),
  );

  currentTaskId: string;
  currentTaskId$: Observable<string> = this._store.pipe(
    select(selectCurrentTaskId),
    // NOTE: we can't use share here, as we need the last emitted value
  );

  currentTask$: Observable<Task> = this._store.pipe(
    select(selectCurrentTask),
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
  todaysTasksFlat$: Observable<TaskWithSubTasks[]> = this._store.pipe(
    select(selectTodaysTasksFlat),
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


  // META FIELDS
  // -----------
  estimateRemainingToday$: Observable<any> = this._store.pipe(
    select(selectEstimateRemainingForToday),
    distinctUntilChanged(),
  );
  estimateRemainingBacklog$: Observable<any> = this._store.pipe(
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

  // TODO could be more efficient than using combine latest
  workingToday$: Observable<any> = this.todaysTasks$.pipe(
    map((tasks) => {
      const date = getWorklogStr();
      return tasks && tasks.length && tasks.reduce((acc, task) => {
          return acc + (
            (task.timeSpentOnDay && +task.timeSpentOnDay[date])
              ? +task.timeSpentOnDay[date] : 0
          );
        }, 0
      );
    }),
    // throttleTime(50)
  );
  tasksWithMissingIssueData$ = this._store.pipe(
    // wait for issue model to be loaded
    debounceTime(1000),
    select(selectTasksWithMissingIssueData),
    distinctUntilChanged(),
  );

  onTaskSwitchList$: Observable<any> = this._actions$.pipe(ofType(
    TaskActionTypes.MoveToBacklog,
    TaskActionTypes.MoveToToday,
    TaskActionTypes.AddTask,
  ));

  isTriggerPlanningMode$: Observable<boolean> = this._store.pipe(select(selectIsTriggerPlanningMode));

  private _allTasksWithIssueData$: Observable<TaskWithIssueData[]> = this._store.pipe(select(selectAllTasksWithIssueData));


  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
    private readonly _issueService: IssueService,
    private readonly _projectService: ProjectService,
    private readonly _timeTrackingService: TimeTrackingService,
    private readonly _actions$: Actions,
  ) {
    // this.todaysTasks$.subscribe((val) => console.log(val));
    // this.focusTaskId$.subscribe((val) => console.log('SVC', val));
    this.tasksWithMissingIssueData$
      .pipe(delay(5000))
      .subscribe((tasks) => {
        if (tasks && tasks.length > 0) {
          console.warn('MISSING ISSUE', tasks);
          // TODO find a better solution for this
          tasks.forEach(task => {
            this._issueService.loadMissingIssueData(task.issueType, task.issueId);
          });
        }
      });

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
    const lsTaskState = await this._persistenceService.loadTasksForProject(projectId);
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

  moveToToday(id) {
    this._store.dispatch(new MoveToToday({id}));
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


  // HELPER
  // ------
  getById(id: string): Observable<Task> {
    return this._store.pipe(select(selectTaskById, {id}), take(1));
  }

  setDone(id: string) {
    this.update(id, {isDone: true});
  }

  setUnDone(id: string) {
    this.update(id, {isDone: false});
  }

  showAdditionalInfoOpen(id: string) {
    this.updateUi(id, {_isAdditionalInfoOpen: true});
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

  async checkForTaskWithIssue(issue: IssueData): Promise<{
    task: TaskWithIssueData | TaskWithSubTasks,
    isFromArchive: boolean,
  }> {
    const allTasks = await this._allTasksWithIssueData$.pipe(first()).toPromise();
    const taskWithSameIssue: TaskWithIssueData = allTasks.find(task => task.issueId === issue.id);

    if (taskWithSameIssue) {
      return {task: taskWithSameIssue, isFromArchive: false};
    } else {
      const allArchiveTasks = await this._persistenceService.loadTaskArchiveForProject(this._projectService.currentId);
      const ids = allArchiveTasks && allArchiveTasks.ids as string[];
      if (ids) {
        const archiveTaskWithSameIssue = ids.map(id => allArchiveTasks.entities[id]).find(task => task.issueId === issue.id);
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
}
