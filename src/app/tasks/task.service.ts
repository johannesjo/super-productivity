import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { Task, TaskWithAllData, TaskWithSubTaskData } from './task.model';
import { select, Store } from '@ngrx/store';
import 'rxjs/add/operator/map';
import { TaskActionTypes } from './store/task.actions';
import shortid from 'shortid';
import { initialTaskState, selectAllTasks, selectCurrentTask, selectMainTasksWithSubTasks } from './store/task.reducer';
import { ProjectService } from '../project/project.service';
import { PersistenceService } from '../core/persistence/persistence.service';
import { IssueService } from '../issue/issue.service';
import { IssueProviderKey } from '../issue/issue';

@Injectable()
export class TaskService {
  currentTaskId$: Observable<string> = this._store.pipe(select(selectCurrentTask));
  flatTasks$: Observable<Task[]> = this._store.pipe(select(selectAllTasks));

  // TODO map issue data before sub tasks
  tasksWithSubTasks$: Observable<TaskWithSubTaskData[]> = this._store.pipe(select(selectMainTasksWithSubTasks));

  tasks$: Observable<TaskWithAllData[]> = combineLatest(this.tasksWithSubTasks$, this._issueService.issueEntityMap$)
    .map(([tasks, issueEntityMap]) => tasks.map((task) => {
      const issueData = (task.issueId && task.issueType) && issueEntityMap[task.issueType][task.issueId];
      return issueData ? Object.assign({issueData: issueData}, task) : task;
    }));

  missingIssuesForTasks$ = this.tasks$.map(
    (tasks) => tasks && tasks.filter((task: TaskWithAllData) => (!task.issueData && (task.issueType || task.issueId)))
      .map(task => task.issueId)
  );

  undoneTasks$: Observable<TaskWithAllData[]> = this.tasks$.map(
    (tasks) => tasks && tasks.filter((task: TaskWithAllData) => !task.isDone)
  );
  doneTasks$: Observable<TaskWithAllData[]> = this.tasks$.map(
    (tasks) => tasks && tasks.filter((task: TaskWithAllData) => task.isDone)
  );

  // tasksId$: Observable<string[] | number[]> = this._store.pipe(select(selectTaskIds));

  constructor(
    private readonly _store: Store<any>,
    private readonly _projectService: ProjectService,
    private readonly _issueService: IssueService,
    private readonly _persistenceService: PersistenceService,
  ) {
    this.missingIssuesForTasks$.subscribe((val) => {
      console.log('MISSING ISSUE', val);
    });

    this._projectService.currentId$.subscribe((projectId) => {
      this.loadStateForProject(projectId);
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
