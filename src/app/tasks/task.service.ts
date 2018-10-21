import { map, withLatestFrom } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { Task, TaskWithAllData, TaskWithSubTaskData } from './task.model';
import { select, Store } from '@ngrx/store';
import { TaskActionTypes } from './store/task.actions';
import shortid from 'shortid';
import { initialTaskState, selectAllTasks, selectCurrentTask, selectMainTasksWithSubTasks } from './store/task.reducer';
import { ProjectService } from '../project/project.service';
import { PersistenceService } from '../core/persistence/persistence.service';
import { IssueService } from '../issue/issue.service';
import { IssueProviderKey } from '../issue/issue';
import { TimeTrackingService } from '../core/time-tracking/time-tracking.service';
import { Tick } from '../core/time-tracking/time-tracking';

@Injectable()
export class TaskService {
  currentTaskId$: Observable<string> = this._store.pipe(select(selectCurrentTask));
  flatTasks$: Observable<Task[]> = this._store.pipe(select(selectAllTasks));

  // TODO map issue data before sub tasks
  tasksWithSubTasks$: Observable<TaskWithSubTaskData[]> = this._store.pipe(select(selectMainTasksWithSubTasks));

  tasks$: Observable<TaskWithAllData[]> = combineLatest(this.tasksWithSubTasks$, this._issueService.issueEntityMap$).pipe(
    map(([tasks, issueEntityMap]) => tasks.map((task) => {
      const issueData = (task.issueId && task.issueType) && issueEntityMap[task.issueType][task.issueId];
      return issueData ? Object.assign({issueData: issueData}, task) : task;
    })));

  backlogTasks$: Observable<TaskWithAllData[]> = this.tasks$.pipe(map(
    (tasks) => tasks && tasks.filter((task: TaskWithAllData) => task.isBacklogTask)
  ));

  todaysTasks$: Observable<TaskWithAllData[]> = this.tasks$.pipe(map(
    (tasks) => tasks && tasks.filter((task: TaskWithAllData) => !task.isBacklogTask)
  ));

  undoneTasks$: Observable<TaskWithAllData[]> = this.todaysTasks$.pipe(map(
    (tasks) => tasks && tasks.filter((task: TaskWithAllData) => !task.isDone)
  ));
  doneTasks$: Observable<TaskWithAllData[]> = this.todaysTasks$.pipe(map(
    (tasks) => tasks && tasks.filter((task: TaskWithAllData) => task.isDone)
  ));


  // META FIELDS
  // -----------
  missingIssuesForTasks$ = this.tasks$.pipe(map(
    (tasks) => tasks && tasks.filter((task: TaskWithAllData) => (!task.issueData && (task.issueType || task.issueId)))
      .map(task => task.issueId)
  ));


  // TODO could be more efficient than using combine latest
  workingToday$: Observable<any> = combineLatest(this.flatTasks$, this._timeTrackingService.tick$).pipe(
    map(([tasks, tick]) => tasks && tasks.length && tasks.reduce((acc, task) => {
        return acc + (task.timeSpentOnDay ? +task.timeSpentOnDay[tick.date] : 0);
      }, 0
    )));

  estimateRemaining$: Observable<any> = this.flatTasks$.pipe(
    map((tasks) => tasks && tasks.length && tasks.reduce((acc, task) => {
        const estimateRemaining = (+task.timeEstimate) - (+task.timeSpent);
        const isTrackVal = (estimateRemaining > 0) && !task.isDone;
        return acc + ((isTrackVal) ? estimateRemaining : 0);
      }, 0
    )));


  // tasksId$: Observable<string[] | number[]> = this._store.pipe(select(selectTaskIds));

  constructor(
    private readonly _store: Store<any>,
    private readonly _projectService: ProjectService,
    private readonly _issueService: IssueService,
    private readonly _persistenceService: PersistenceService,
    private readonly _timeTrackingService: TimeTrackingService,
  ) {
    this.missingIssuesForTasks$.subscribe((val) => {
      if (val && val.length > 0) {
        console.error('MISSING ISSUE', val);
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
  setCurrentId(taskId: string) {
    this._store.dispatch({
      type: TaskActionTypes.SetCurrentTask,
      payload: taskId,
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
  add(title: string) {
    this._store.dispatch({
      type: TaskActionTypes.AddTask,
      payload: {
        task: {
          title,
          id: shortid(),
          isDone: false,
          subTaskIds: []
        }
      }
    });
  }


  addWithIssue(title: string, issueType: IssueProviderKey, issueData) {
    console.log(title, issueType, issueData);
    this._store.dispatch({
      type: TaskActionTypes.AddTaskWithIssue,
      payload: {
        task: {
          title,
          issueId: issueData.id,
          issueType: issueType,
          id: shortid(),
          isDone: false,
          subTaskIds: []
        },
        issue: issueData
      }
    });
  }

  remove(taskId: string) {
    this._store.dispatch({
      type: TaskActionTypes.DeleteTask,
      payload: {id: taskId}
    });
  }


  update(taskId: string, changedFields: Partial<Task>) {
    this._store.dispatch({
      type: TaskActionTypes.UpdateTask,
      payload: {
        task: {
          id: taskId,
          changes: changedFields
        }
      }
    });
  }

  moveAfter(taskId, targetItemId: string | undefined) {
    this._store.dispatch({
      type: TaskActionTypes.MoveAfter,
      payload: {
        taskId,
        targetItemId,
      }
    });
  }

  addSubTask(parentTask: Task) {
    this._store.dispatch({
      type: TaskActionTypes.AddSubTask,
      payload: {
        task: {
          title: '',
          id: shortid(),
          isDone: false
        },
        parentId: parentTask.id
      }
    });
  }

  addTimeSpent(taskId: string, tick: Tick) {
    this._store.dispatch({
      type: TaskActionTypes.AddTimeSpent,
      payload: {
        taskId: taskId,
        tick: tick,
      }
    });
  }

  updateTimeSpent(taskId: string, tick: Tick) {
    this._store.dispatch({
      type: TaskActionTypes.AddTimeSpent,
      payload: {
        taskId: taskId,
        tick: tick,
      }
    });
  }

  // HELPER
  // ------
  setDone(taskId: string) {
    this.update(taskId, {isDone: true});
  }

  setUnDone(taskId: string) {
    this.update(taskId, {isDone: false});
  }

  showNotes(taskId: string) {
    this.update(taskId, {isNotesOpen: true});
  }

  hideNotes(taskId: string) {
    this.update(taskId, {isNotesOpen: false});
  }
}
