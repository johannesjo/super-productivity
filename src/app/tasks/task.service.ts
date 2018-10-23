import { map, withLatestFrom } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { Task, TaskWithSubTasks } from './task.model';
import { select, Store } from '@ngrx/store';
import { TaskActionTypes } from './store/task.actions';
import shortid from 'shortid';
import {
  initialTaskState,
  selectAllTasksWithSubTasks,
  selectBacklogTasksWithSubTasks,
  selectCurrentTask,
  selectTodaysTasksWithSubTasks,
} from './store/task.reducer';
import { ProjectService } from '../project/project.service';
import { PersistenceService } from '../core/persistence/persistence.service';
import { IssueService } from '../issue/issue.service';
import { IssueProviderKey } from '../issue/issue';
import { TimeTrackingService } from '../core/time-tracking/time-tracking.service';
import { Tick } from '../core/time-tracking/time-tracking';


@Injectable()
export class TaskService {
  currentTaskId$: Observable<string> = this._store.pipe(select(selectCurrentTask));

  tasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectAllTasksWithSubTasks));

  todaysTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectTodaysTasksWithSubTasks));

  backlogTasks$: Observable<TaskWithSubTasks[]> = this._store.pipe(select(selectBacklogTasksWithSubTasks));


  undoneTasks$: Observable<TaskWithSubTasks[]> = this.todaysTasks$.pipe(map(
    (tasks) => tasks && tasks.filter((task: TaskWithSubTasks) => !task.isDone)
  ));
  doneTasks$: Observable<TaskWithSubTasks[]> = this.todaysTasks$.pipe(map(
    (tasks) => tasks && tasks.filter((task: TaskWithSubTasks) => task.isDone)
  ));


  // META FIELDS
  // -----------
  missingIssuesForTasks$ = this.tasks$.pipe(map(
    (tasks) => tasks && tasks.filter((task: TaskWithSubTasks) => (!task.issueData && (task.issueType || task.issueId)))
      .map(task => task.issueId)
  ));


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

  estimateRemaining$: Observable<any> = this.tasks$.pipe(
    map((tasks) => tasks && tasks.length && tasks.reduce((acc, task) => {
        const estimateRemaining = (+task.timeEstimate) - (+task.timeSpent);
        const isTrackVal = (estimateRemaining > 0) && !task.isDone;
        return acc + ((isTrackVal) ? estimateRemaining : 0);
      }, 0
    ))
    // throttleTime(50)
  );


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
  add(title: string, isAddToBacklog = false) {
    this._store.dispatch({
      type: TaskActionTypes.AddTask,
      payload: {
        task: {
          title,
          id: shortid(),
          isDone: false,
          subTaskIds: []
        },
        isAddToBacklog
      }
    });
  }


  addWithIssue(title: string, issueType: IssueProviderKey, issue: any, isAddToBacklog = false) {
    console.log(title, issueType, issue);
    this._store.dispatch({
      type: TaskActionTypes.AddTaskWithIssue,
      payload: {
        task: {
          title,
          issueId: issue.id,
          issueType: issueType,
          id: shortid(),
          isDone: false,
          subTaskIds: []
        },
        issue,
        isAddToBacklog
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
