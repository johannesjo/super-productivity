import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { combineLatest } from 'rxjs';
import { Task } from './task.model';
import { TaskWithAllData } from './task.model';
import { Store } from '@ngrx/store';
import { select } from '@ngrx/store';
import 'rxjs/add/operator/map';
import { TaskActionTypes } from './store/task.actions';
import shortid from 'shortid';
import { selectCurrentTask } from './store/task.reducer';
import { selectAllTasks } from './store/task.reducer';
import { selectMainTasksWithSubTasks } from './store/task.reducer';
import { initialTaskState } from './store/task.reducer';
import { ProjectService } from '../project/project.service';
import { PersistenceService } from '../core/persistence/persistence.service';
import { JiraIssueService } from '../issue/jira-issue/jira-issue.service';


@Injectable()
export class TaskService {
  currentTaskId$: Observable<string> = this._store.pipe(select(selectCurrentTask));
  flatTasks$: Observable<Task[]> = this._store.pipe(select(selectAllTasks));
  tasksWithSubTasks$: Observable<TaskWithAllData[]> = this._store.pipe(select(selectMainTasksWithSubTasks));
  tasks$: Observable<TaskWithAllData[]> = combineLatest(this.tasksWithSubTasks$, this._jiraIssueService.jiraIssuesEntities$)
    .map(([tasks, jiraIssuesEntities]) => {
      return tasks.map((task) => {
        const issueDataForTask = jiraIssuesEntities[task.issueId];
        return issueDataForTask ? Object.assign({issueData: issueDataForTask}, task) : task;
      });
    });

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
    private readonly _jiraIssueService: JiraIssueService,
    private readonly _persistenceService: PersistenceService,
  ) {

    this._jiraIssueService.jiraIssuesEntities$.subscribe((val) => console.log(val));
    this.tasks$.subscribe((val) => console.log(val));
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
          issueId: 'TEST',
          id: shortid(),
          isDone: false,
          subTasks: []
        }
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
}
