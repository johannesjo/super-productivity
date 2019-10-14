import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {MoveToOtherProject, TaskActionTypes} from './task.actions';
import {select, Store} from '@ngrx/store';
import {tap, withLatestFrom} from 'rxjs/operators';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {selectCurrentProjectId} from '../../project/store/project.reducer';
import {TaskWithSubTasks} from '../task.model';
import {ReminderService} from '../../reminder/reminder.service';
import {Router} from '@angular/router';


@Injectable()
export class TaskRelatedModelEffects {
  @Effect({dispatch: false})
  moveToArchive$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.MoveToArchive,
    ),
    withLatestFrom(
      this._store$.pipe(select(selectCurrentProjectId)),
    ),
    tap(this._moveToArchive.bind(this)),
    tap(this._updateLastActive.bind(this)),
  );

  @Effect({dispatch: false})
  moveToOtherProject: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.MoveToOtherProject,
    ),
    tap(this._moveToOtherProject.bind(this)),
    tap(this._updateLastActive.bind(this)),
  );

  @Effect({dispatch: false})
  restoreTask$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.RestoreTask,
    ),
    withLatestFrom(
      this._store$.pipe(select(selectCurrentProjectId)),
    ),
    tap(this._removeFromArchive.bind(this))
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

  private _removeFromArchive([action, currentProjectId]) {
    const task = action.payload.task;
    const taskIds = [task.id, ...task.subTaskIds];
    this._persistenceService.removeTasksFromArchive(currentProjectId, taskIds);
  }

  private _moveToArchive([action, currentProjectId]) {
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

    this._persistenceService.saveToTaskArchiveForProject(currentProjectId, archive);
  }

  private _moveToOtherProject(action: MoveToOtherProject) {
    const mainTasks = action.payload.tasks as TaskWithSubTasks[];
    const projectId = action.payload.projectId;
    mainTasks.forEach((task: TaskWithSubTasks) => {
      if (task.reminderId) {
        this._reminderService.updateReminder(task.reminderId, {projectId});
      }

      if (task.subTasks) {
        task.subTasks.forEach((subTask) => {
          if (subTask.reminderId) {
            this._reminderService.updateReminder(subTask.reminderId, {projectId});
          }
        });
      }
    });

    this._persistenceService.saveTasksToProject(projectId, mainTasks);
  }

}


