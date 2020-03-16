import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {MoveToOtherProject, TaskActionTypes, UpdateTask} from './task.actions';
import {Store} from '@ngrx/store';
import {filter, map, tap} from 'rxjs/operators';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {TaskWithSubTasks} from '../task.model';
import {ReminderService} from '../../reminder/reminder.service';
import {Router} from '@angular/router';
import {moveTaskInTodayList} from '../../work-context/store/work-context-meta.actions';


@Injectable()
export class TaskRelatedModelEffects {
  // EFFECTS ===> EXTERNAL
  // ---------------------
  @Effect({dispatch: false})
  moveToArchive$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.MoveToArchive,
    ),
    tap(this._moveToArchive.bind(this)),
    tap(this._updateLastActive.bind(this)),
  );

  // TODO remove once reminder is changed
  @Effect({dispatch: false})
  moveToOtherProject: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.MoveToOtherProject,
    ),
    tap(this._moveToOtherProject.bind(this)),
  );

  @Effect({dispatch: false})
  restoreTask$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.RestoreTask,
    ),
    tap(this._removeFromArchive.bind(this))
  );

  // EXTERNAL ===> TASKS
  // -------------------
  @Effect()
  moveTaskToUnDone$: any = this._actions$.pipe(
    ofType(
      moveTaskInTodayList,
    ),
    filter(({src, target}) => src === 'DONE' && target === 'UNDONE'),
    map(({taskId}) => new UpdateTask({
      task: {
        id: taskId,
        changes: {
          isDone: false,
        }
      }
    }))
  );

  @Effect()
  moveTaskToDone$: any = this._actions$.pipe(
    ofType(
      moveTaskInTodayList,
    ),
    filter(({src, target}) => src === 'UNDONE' && target === 'DONE'),
    map(({taskId}) => new UpdateTask({
      task: {
        id: taskId,
        changes: {
          isDone: true,
        }
      }
    }))
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _reminderService: ReminderService,
    private _router: Router,
    private _persistenceService: PersistenceService
  ) {
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }

  private _removeFromArchive([action]) {
    const task = action.payload.task;
    const taskIds = [task.id, ...task.subTaskIds];
    this._persistenceService.removeTasksFromArchive(taskIds);
  }

  private _moveToArchive([action]) {
    const mainTasks = action.payload.tasks as TaskWithSubTasks[];
    const archive = {
      entities: {},
      ids: []
    };
    mainTasks.forEach((task: TaskWithSubTasks) => {
      const {subTasks, ...taskWithoutSub} = task;
      archive.entities[task.id] = {
        ...taskWithoutSub,
        reminderId: undefined,
        isDone: true,
      };
      if (taskWithoutSub.reminderId) {
        this._reminderService.removeReminder(taskWithoutSub.reminderId);
      }

      archive.ids.push(taskWithoutSub.id);
      if (task.subTasks) {
        task.subTasks.forEach((subTask) => {
          archive.entities[subTask.id] = {
            ...subTask,
            reminderId: undefined,
            isDone: true,
          };
          archive.ids.push(subTask.id);
          if (subTask.reminderId) {
            this._reminderService.removeReminder(subTask.reminderId);
          }
        });
      }
    });

    this._persistenceService.addTasksToArchive(archive);
  }

  private _moveToOtherProject(action: MoveToOtherProject) {
    const mainTasks = action.payload.task as TaskWithSubTasks;
    const projectId = action.payload.targetProjectId;

    if (mainTasks.reminderId) {
      this._reminderService.updateReminder(mainTasks.reminderId, {projectId});
    }

    if (mainTasks.subTasks) {
      mainTasks.subTasks.forEach((subTask) => {
        if (subTask.reminderId) {
          this._reminderService.updateReminder(subTask.reminderId, {projectId});
        }
      });
    }
  }
}


