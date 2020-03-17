import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {MoveToArchive, MoveToOtherProject, RestoreTask, TaskActionTypes, UpdateTask} from './task.actions';
import {Store} from '@ngrx/store';
import {filter, map, tap} from 'rxjs/operators';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {TaskArchive, TaskWithSubTasks} from '../task.model';
import {ReminderService} from '../../reminder/reminder.service';
import {Router} from '@angular/router';
import {moveTaskInTodayList} from '../../work-context/store/work-context-meta.actions';
import {taskAdapter} from './task.adapter';
import {flattenTasks} from './task.selectors';


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

  private async _removeFromArchive(action: RestoreTask) {
    const task = action.payload.task;
    const taskIds = [task.id, ...task.subTaskIds];
    const currentArchive: TaskArchive = await this._persistenceService.taskArchive.loadState();
    const allIds = currentArchive.ids as string[] || [];
    const idsToRemove = [];

    taskIds.forEach((taskId) => {
      if (allIds.indexOf(taskId) > -1) {
        delete currentArchive.entities[taskId];
        idsToRemove.push(taskId);
      }
    });

    return this._persistenceService.taskArchive.saveState({
      ...currentArchive,
      ids: allIds.filter((id) => !idsToRemove.includes(id)),
    }, true);
  }

  private async _moveToArchive(action: MoveToArchive) {
    const flatTasks = flattenTasks(action.payload.tasks);
    if (!flatTasks.length) {
      return;
    }

    const currentArchive: TaskArchive = await this._persistenceService.taskArchive.loadState() || {
      entities: {},
      ids: []
    };

    const newArchive = taskAdapter.addMany(flatTasks.map(({subTasks, ...task}) => ({
      ...task,
      reminderId: null,
      isDone: true,
    })), currentArchive);

    flatTasks
      .filter(t => !!t.reminderId)
      .forEach(t => {
        this._reminderService.removeReminder(t.reminderId);
      });

    console.log(newArchive);

    return this._persistenceService.taskArchive.saveState(newArchive);
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


