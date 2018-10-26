import { map, withLatestFrom } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { Task, TaskWithSubTasks } from './task.model';
import { select, Store } from '@ngrx/store';
import { TaskActionTypes } from './store/task.actions';
import shortid from 'shortid';
import { initialTaskState, } from './store/task.reducer';
import { ProjectService } from '../project/project.service';
import { PersistenceService } from '../core/persistence/persistence.service';
import { IssueService } from '../issue/issue.service';
import { IssueProviderKey } from '../issue/issue';
import { TimeTrackingService } from '../core/time-tracking/time-tracking.service';
import { Tick } from '../core/time-tracking/time-tracking';
import {
  selectAllTasksWithSubTasks,
  selectBacklogTasksWithSubTasks,
  selectCurrentTask, selectEstimateRemainingForBacklog, selectEstimateRemainingForToday,
  selectTodaysDoneTasksWithSubTasks,
  selectTodaysTasksWithSubTasks,
  selectTodaysUnDoneTasksWithSubTasks
} from './store/task.selectors';


@Injectable()
export class TaskService {
  currentTaskId$: Observable<string> = this._store.pipe(select(selectCurrentTask));

  tasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectAllTasksWithSubTasks));
  todaysTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectTodaysTasksWithSubTasks));
  backlogTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectBacklogTasksWithSubTasks));

  undoneTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectTodaysUnDoneTasksWithSubTasks));
  doneTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectTodaysDoneTasksWithSubTasks));


  // META FIELDS
  // -----------
  estimateRemainingToday$: Observable<any> = this._store.pipe(select(selectEstimateRemainingForToday));
    // throttleTime(50)
  estimateRemainingBacklog$: Observable<any> = this._store.pipe(select(selectEstimateRemainingForBacklog));
    // throttleTime(50)

  // TODO could be more efficient than using combine latest
  workingToday$: Observable<any> = combineLatest(this.tasks$, this._timeTrackingService.tick$).pipe(
    map(([tasks, tick]) => tasks && tasks.length && tasks.reduce((acc, task) => {
        return acc + (
          (task.timeSpentOnDay && +task.timeSpentOnDay[tick.date])
            ? +task.timeSpentOnDay[tick.date] : 0
        );
      }, 0
    )),
    // throttleTime(50)
  );



  missingIssuesForTasks$ = this.tasks$.pipe(map(
    (tasks) => tasks && tasks.filter((task: TaskWithSubTasks) => (!task.issueData && (task.issueType || task.issueId)))
      .map(task => task.issueId)
  ));


  // tasksId$: Observable<string[] | number[]> = this._store.pipe(select(selectTaskIds));

  constructor(
    private readonly _store: Store<any>,
    private readonly _projectService: ProjectService,
    private readonly _issueService: IssueService,
    private readonly _persistenceService: PersistenceService,
    private readonly _timeTrackingService: TimeTrackingService,
  ) {
    this.todaysTasks$.subscribe((val) => console.log(val));
    this.missingIssuesForTasks$.subscribe((val) => {
      if (val && val.length > 0) {
        console.warn('MISSING ISSUE', val);
      }
    });

    this._projectService.currentId$.subscribe((projectId) => {
      this.loadStateForProject(projectId);
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
    this._store.dispatch({
      type: TaskActionTypes.SetCurrentTask,
      payload: id,
    });
  }

  loadStateForProject(projectId) {
    const lsTaskState = this._persistenceService.loadTasksForProject(projectId);
    this.loadState(lsTaskState || initialTaskState);
  }

  loadState(state) {
    this._store.dispatch({
      type: TaskActionTypes.LoadState,
      payload: {
        state: state,
      }
    });
  }

  pauseCurrent() {
    this._store.dispatch({
      type: TaskActionTypes.UnsetCurrentTask,
    });
  }

  // Tasks
  // -----
  add(title: string, isAddToBacklog = false) {
    this._store.dispatch({
      type: TaskActionTypes.AddTask,
      payload: {
        task: this._createNewTask(title),
        isAddToBacklog
      }
    });
  }


  addWithIssue(title: string, issueType: IssueProviderKey, issue: any, isAddToBacklog = false) {
    this._store.dispatch({
      type: TaskActionTypes.AddTask,
      payload: {
        task: this._createNewTask(title, {
          issueId: issue.id,
          issueType: issueType,
        }),
        issue,
        isAddToBacklog
      }
    });
  }

  remove(id: string) {
    this._store.dispatch({
      type: TaskActionTypes.DeleteTask,
      payload: {id: id}
    });
  }


  update(id: string, changedFields: Partial<Task>) {
    this._store.dispatch({
      type: TaskActionTypes.UpdateTask,
      payload: {
        task: {
          id: id,
          changes: changedFields
        }
      }
    });
  }

  move(id: string, targetItemId: string, isMoveAfter = false) {
    this._store.dispatch({
      type: TaskActionTypes.Move,
      payload: {
        id,
        targetItemId,
        isMoveAfter,
      }
    });
  }

  moveUp(id: string) {
    this._store.dispatch({
      type: TaskActionTypes.MoveUp,
      payload: {
        id,
      }
    });
  }

  moveDown(id: string) {
    this._store.dispatch({
      type: TaskActionTypes.MoveDown,
      payload: {
        id,
      }
    });
  }

  addSubTaskTo(parentId) {
    this._store.dispatch({
      type: TaskActionTypes.AddSubTask,
      payload: {
        task: this._createNewTask(''),
        parentId: parentId
      }
    });
  }

  addTimeSpent(id: string, tick: Tick) {
    this._store.dispatch({
      type: TaskActionTypes.AddTimeSpent,
      payload: {
        id: id,
        tick: tick,
      }
    });
  }

  moveToToday(id) {
    this._store.dispatch({
      type: TaskActionTypes.MoveToToday,
      payload: {
        id: id,
      }
    });
  }

  moveToBacklog(id) {
    this._store.dispatch({
      type: TaskActionTypes.MoveToBacklog,
      payload: {
        id: id,
      }
    });
  }

  moveToArchive(id) {
    this._store.dispatch({
      type: TaskActionTypes.MoveToArchive,
      payload: {
        id: id,
      }
    });
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

  private _createNewTask(title: string, additional: Partial<Task> = {}): Partial<Task> {
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
