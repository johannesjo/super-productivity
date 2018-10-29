import { debounceTime, distinctUntilChanged, map, withLatestFrom } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { Task, TaskWithSubTasks } from './task.model';
import { select, Store } from '@ngrx/store';
import { AddTask, TaskActionTypes } from './store/task.actions';
import shortid from 'shortid';
import { initialTaskState, } from './store/task.reducer';
import { PersistenceService } from '../core/persistence/persistence.service';
import { IssueProviderKey } from '../issue/issue';
import { TimeTrackingService } from '../core/time-tracking/time-tracking.service';
import { Tick } from '../core/time-tracking/time-tracking';
import {
  selectAllTasksWithSubTasks,
  selectBacklogTasksWithSubTasks,
  selectCurrentTaskId,
  selectEstimateRemainingForBacklog,
  selectEstimateRemainingForToday,
  selectFocusIdsForDailyPlanner,
  selectFocusIdsForWorkView,
  selectFocusTaskId,
  selectMissingIssueIds,
  selectTodaysDoneTasksWithSubTasks,
  selectTodaysTasksWithSubTasks,
  selectTodaysUnDoneTasksWithSubTasks,
  selectTotalTimeWorkedOnTodaysTasks
} from './store/task.selectors';


@Injectable()
export class TaskService {
  currentTaskId$: Observable<string> = this._store.pipe(select(selectCurrentTaskId), distinctUntilChanged());

  tasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectAllTasksWithSubTasks), distinctUntilChanged());
  todaysTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectTodaysTasksWithSubTasks), distinctUntilChanged());
  backlogTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectBacklogTasksWithSubTasks), distinctUntilChanged());

  undoneTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectTodaysUnDoneTasksWithSubTasks), distinctUntilChanged());
  doneTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectTodaysDoneTasksWithSubTasks), distinctUntilChanged());

  // NOTE: don't use distinct until changed here
  focusTaskId$: Observable<string> = this._store.pipe(select(selectFocusTaskId));
  focusIdsForWorkView$: Observable<string[]> = this._store.pipe(select(selectFocusIdsForWorkView), distinctUntilChanged());
  focusIdsForDailyPlanner$: Observable<string[]> = this._store.pipe(select(selectFocusIdsForDailyPlanner, distinctUntilChanged()));

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

    // time tracking
    this._timeTrackingService.tick$
      .pipe(withLatestFrom(this.currentTaskId$))
      .subscribe(([tick, currentId]) => {
        if (currentId) {
          this.addTimeSpent(currentId, tick);
        }
      });
  }

  // META
  // ----
  setCurrentId(id: string) {
    this._storeDispatch(TaskActionTypes.SetCurrentTask, id);
  }

  loadStateForProject(projectId) {
    const lsTaskState = this._persistenceService.loadTasksForProject(projectId);
    this.loadState(lsTaskState || initialTaskState);
  }

  loadState(state) {
    this._storeDispatch(TaskActionTypes.LoadTaskState, {state});
  }

  pauseCurrent() {
    this._storeDispatch(TaskActionTypes.UnsetCurrentTask);
  }

  // Tasks
  // -----
  add(title: string, isAddToBacklog = false) {
    // TODO decide which syntax to use
    this._store.dispatch(new AddTask({
      task: this._createNewTask(title),
      isAddToBacklog: isAddToBacklog
    }));
    // this._storeDispatch(TaskActionTypes.AddTask, {
    //   task: this._createNewTask(title),
    //   isAddToBacklog
    // });
  }


  addWithIssue(title: string, issueType: IssueProviderKey, issue: any, isAddToBacklog = false) {
    this._storeDispatch(TaskActionTypes.AddTask, {
      task: this._createNewTask(title, {
        issueId: issue.id,
        issueType: issueType,
      }),
      issue,
      isAddToBacklog
    });
  }

  remove(id: string) {
    this._storeDispatch(TaskActionTypes.DeleteTask, {id});
  }


  update(id: string, changedFields: Partial<Task>) {
    this._storeDispatch(TaskActionTypes.UpdateTask, {
      task: {id, changes: changedFields}
    });
  }

  move(id: string, targetItemId: string, isMoveAfter = false) {
    this._storeDispatch(TaskActionTypes.Move, {
      id,
      targetItemId,
      isMoveAfter,
    });
  }

  moveUp(id: string) {
    this._storeDispatch(TaskActionTypes.MoveUp, {id});
  }

  moveDown(id: string) {
    this._storeDispatch(TaskActionTypes.MoveDown, {id});
  }

  addSubTaskTo(parentId) {
    this._storeDispatch(TaskActionTypes.AddSubTask, {
      task: this._createNewTask(''),
      parentId: parentId
    });
  }

  addTimeSpent(id: string, tick: Tick) {
    this._storeDispatch(TaskActionTypes.AddTimeSpent, {id, tick});
  }

  focusTask(id: string) {
    this._storeDispatch(TaskActionTypes.FocusTask, {id});
  }

  moveToToday(id) {
    this._storeDispatch(TaskActionTypes.MoveToToday, {id});
  }

  moveToBacklog(id) {
    this._storeDispatch(TaskActionTypes.MoveToBacklog, {id});
  }

  moveToArchive(ids: string | string[]) {
    if (typeof ids === 'string') {
      ids = [ids];
    }
    this._storeDispatch(TaskActionTypes.MoveToArchive, {ids});
  }


  // HELPER
  // ------
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

  focusInList(id: string, idList: string[], offset) {
    const currentIndex = idList.indexOf(id);
    if (idList[currentIndex + offset]) {
      this.focusTask(idList[currentIndex + offset]);
    }
  }

  focusNextInList(id: string, idList: string[]) {
    this.focusInList(id, idList, 1);
  }

  focusPreviousInList(id: string, idList: string[]) {
    this.focusInList(id, idList, -1);
  }


  private _storeDispatch(action: TaskActionTypes, payload?: any) {
    this._store.dispatch({
      type: action,
      payload: payload
    });
  }

  private _createNewTask(title: string, additional: Partial<Task> = {}): Task {
    return {
      // NOTE needs to be created every time
      subTaskIds: [],
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 0,
      isDone: false,
      isNotesOpen: false,
      title,
      id: shortid(),
      ...additional,
    };
  }
}
