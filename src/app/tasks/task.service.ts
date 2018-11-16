import shortid from 'shortid';
import { debounceTime, distinctUntilChanged, map, take, withLatestFrom } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { DropListModelSource, Task, TaskWithSubTasks } from './task.model';
import { select, Store } from '@ngrx/store';
import {
  AddSubTask,
  AddTask,
  AddTimeSpent,
  DeleteTask,
  FocusTask,
  LoadTaskState,
  Move,
  MoveDown,
  MoveToArchive,
  MoveToBacklog,
  MoveToToday,
  MoveUp,
  RemoveTimeSpent,
  SetCurrentTask,
  UnsetCurrentTask,
  UpdateTask
} from './store/task.actions';
import { initialTaskState, } from './store/task.reducer';
import { PersistenceService } from '../core/persistence/persistence.service';
import { IssueProviderKey } from '../issue/issue';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';
import {
  selectAllStartableTasks,
  selectAllTasksWithSubTasks,
  selectBacklogTasksWithSubTasks,
  selectCurrentTaskId,
  selectEstimateRemainingForBacklog,
  selectEstimateRemainingForToday,
  selectFocusIdsForBacklog,
  selectFocusIdsForWorkView,
  selectFocusTaskId,
  selectMissingIssueIds,
  selectTaskById,
  selectTodaysDoneTasksWithSubTasks,
  selectTodaysTaskIds,
  selectTodaysTasksWithSubTasks,
  selectTodaysUnDoneTasksWithSubTasks,
  selectTotalTimeWorkedOnTodaysTasks
} from './store/task.selectors';
import { stringToMs } from '../ui/duration/string-to-ms.pipe';
import { getWorklogStr } from '../core/util/get-work-log-str';


@Injectable()
export class TaskService {
  currentTaskId$: Observable<string> = this._store.pipe(select(selectCurrentTaskId), distinctUntilChanged());
  currentTaskId: string;

  tasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectAllTasksWithSubTasks), distinctUntilChanged());
  startableTasks$: Observable<Task[]> = this._store.pipe(select(selectAllStartableTasks), distinctUntilChanged());
  todaysTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectTodaysTasksWithSubTasks), distinctUntilChanged());
  todaysTaskIds$: Observable<string[]> = this._store.pipe(select(selectTodaysTaskIds), distinctUntilChanged());

  backlogTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectBacklogTasksWithSubTasks), distinctUntilChanged());

  undoneTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectTodaysUnDoneTasksWithSubTasks), distinctUntilChanged());
  doneTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectTodaysDoneTasksWithSubTasks), distinctUntilChanged());

  // NOTE: don't use distinct until changed here
  focusTaskId$: Observable<string> = this._store.pipe(select(selectFocusTaskId));
  focusIdsForWorkView$: Observable<string[]> = this._store.pipe(select(selectFocusIdsForWorkView), distinctUntilChanged());
  focusIdsForBacklog$: Observable<string[]> = this._store.pipe(select(selectFocusIdsForBacklog), distinctUntilChanged());

  // META FIELDS
  // -----------
  estimateRemainingToday$: Observable<any> = this._store.pipe(select(selectEstimateRemainingForToday), distinctUntilChanged());
  estimateRemainingBacklog$: Observable<any> = this._store.pipe(select(selectEstimateRemainingForBacklog), distinctUntilChanged());
  totalTimeWorkedOnTodaysTasks$: Observable<any> = this._store.pipe(select(selectTotalTimeWorkedOnTodaysTasks), distinctUntilChanged());

  // TODO could be more efficient than using combine latest
  workingToday$: Observable<any> = combineLatest(this.todaysTasks$, this._timeTrackingService.tick$).pipe(
    map(([tasks, tick]) => tasks && tasks.length && tasks.reduce((acc, task) => {
        return acc + (
          (task.timeSpentOnDay && +task.timeSpentOnDay[tick.date])
            ? +task.timeSpentOnDay[tick.date] : 0
        );
      }, 0
    )),
    // throttleTime(50)
  );
  missingIssuesForTasks$ = this._store.pipe(
    // wait for issue model to be loaded
    debounceTime(1000),
    select(selectMissingIssueIds),
    distinctUntilChanged()
  );


  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
    private readonly _timeTrackingService: TimeTrackingService,
  ) {
    // this.todaysTasks$.subscribe((val) => console.log(val));
    // this.focusTaskId$.subscribe((val) => console.log('SVC', val));
    this.missingIssuesForTasks$.subscribe((val) => {
      if (val && val.length > 0) {
        console.warn('MISSING ISSUE', val);
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
    this._store.dispatch(new SetCurrentTask(id));
  }

  loadStateForProject(projectId) {
    const lsTaskState = this._persistenceService.loadTasksForProject(projectId);
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
  ) {
    this._store.dispatch(new AddTask({
      task: this._createNewTask(title, additionalFields),
      isAddToBacklog: isAddToBacklog
    }));
  }

  addWithIssue(title: string,
               issueType: IssueProviderKey,
               issue: any,
               isAddToBacklog = false
  ) {
    this._store.dispatch(new AddTask({
      task: this._createNewTask(title, {
        issueId: issue.id,
        issueType: issueType,
      }),
      issue,
      isAddToBacklog
    }));
  }

  remove(id: string) {
    this._store.dispatch(new DeleteTask({id}));
  }


  update(id: string, changedFields: Partial<Task>) {
    this._store.dispatch(new UpdateTask({
      task: {id, changes: this._shortSyntax(changedFields) as Partial<Task>}
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

  moveToToday(id) {
    this._store.dispatch(new MoveToToday({id}));
  }

  moveToBacklog(id) {
    this._store.dispatch(new MoveToBacklog({id}));
  }

  moveToArchive(ids: string | string[]) {
    if (typeof ids === 'string') {
      ids = [ids];
    }
    this._store.dispatch(new MoveToArchive({ids}));
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

  showNotes(id: string) {
    this.update(id, {isNotesOpen: true});
  }

  hideNotes(id: string) {
    this.update(id, {isNotesOpen: false});
  }

  showSubTasks(id: string) {
    this.update(id, {isHideSubTasks: false});
  }

  hideSubTasks(id: string) {
    this.update(id, {isHideSubTasks: true});
  }

  focusInList(id: string, idList: string[], offset, isSelectReverseIfNotPossible) {
    const currentIndex = idList.indexOf(id);
    if (idList[currentIndex + offset]) {
      if (isSelectReverseIfNotPossible) {
        if (idList[currentIndex + offset]) {
          this.focusTask(idList[currentIndex + offset]);
        } else {
          this.focusTask(idList[currentIndex + (offset * -1)]);
        }
      } else {
        this.focusTask(idList[currentIndex + offset]);
      }
    }
  }

  focusNextInList(id: string, idList: string[], isSelectReverseIfNotPossible) {
    this.focusInList(id, idList, 1, isSelectReverseIfNotPossible);
  }

  focusPreviousInList(id: string, idList: string[], isSelectReverseIfNotPossible) {
    this.focusInList(id, idList, -1, isSelectReverseIfNotPossible);
  }

  private _createNewTask(title: string, additional: Partial<Task> = {}): Task {
    return this._shortSyntax({
      // NOTE needs to be created every time
      subTaskIds: [],
      attachmentIds: [],
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 0,
      isDone: false,
      isNotesOpen: false,
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
    const timeEstimateRegExp = / t[0-9]+(m|h|d)+ *$/i;
    const matches = timeEstimateRegExp.exec(task.title);

    if (matches) {
      return {
        ...task,
        timeEstimate: stringToMs(matches[0].replace(' t', '')),
        title: task.title.replace(matches[0], '')
      };
    } else {
      return task;
    }
  }
}
