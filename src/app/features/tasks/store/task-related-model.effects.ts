import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {
  AddTask,
  AddTimeSpent,
  MoveToArchive,
  MoveToOtherProject,
  RestoreTask,
  TaskActionTypes,
  UpdateTask,
  UpdateTaskTags
} from './task.actions';
import {Store} from '@ngrx/store';
import {concatMap, filter, first, map, mapTo, switchMap, tap} from 'rxjs/operators';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {Task, TaskArchive, TaskWithSubTasks} from '../task.model';
import {ReminderService} from '../../reminder/reminder.service';
import {Router} from '@angular/router';
import {moveTaskInTodayList, moveTaskToTodayList} from '../../work-context/store/work-context-meta.actions';
import {taskAdapter} from './task.adapter';
import {flattenTasks} from './task.selectors';
import {GlobalConfigService} from '../../config/global-config.service';
import {TODAY_TAG} from '../../tag/tag.const';
import {unique} from '../../../util/unique';
import {TaskService} from '../task.service';
import {of} from 'rxjs';
import {createEmptyEntity} from '../../../util/create-empty-entity';
import {ProjectService} from '../../project/project.service';


@Injectable()
export class TaskRelatedModelEffects {
  // EFFECTS ===> EXTERNAL
  // ---------------------
  @Effect({dispatch: false})
  moveToArchive$: any = this._actions$.pipe(
    ofType(TaskActionTypes.MoveToArchive),
    tap(this._moveToArchive.bind(this)),
    tap(this._updateLastLocalSyncModelChange.bind(this)),
  );

  // TODO remove once reminder is changed
  @Effect({dispatch: false})
  moveToOtherProject: any = this._actions$.pipe(
    ofType(TaskActionTypes.MoveToOtherProject),
    tap(this._moveToOtherProject.bind(this)),
  );

  @Effect({dispatch: false})
  restoreTask$: any = this._actions$.pipe(
    ofType(TaskActionTypes.RestoreTask),
    tap(this._removeFromArchive.bind(this))
  );

  @Effect()
  autoAddTodayTag: any = this._actions$.pipe(
    ofType(TaskActionTypes.AddTimeSpent),
    switchMap((a: AddTimeSpent) => a.payload.task.parentId
      ? this._taskService.getByIdOnce$(a.payload.task.parentId)
      : of(a.payload.task),
    ),
    filter((task: Task) => !task.tagIds.includes(TODAY_TAG.id)),
    concatMap((task: Task) => this._globalConfigService.misc$.pipe(
      first(),
      map(miscCfg => ({
        miscCfg,
        task,
      }))
    )),
    filter(({miscCfg, task}) => miscCfg.isAutoAddWorkedOnToToday),
    map(({miscCfg, task}) => new UpdateTaskTags({
      task,
      newTagIds: unique([...task.tagIds, TODAY_TAG.id]),
      oldTagIds: task.tagIds,
    }))
  );

  // EXTERNAL ===> TASKS
  // -------------------
  @Effect()
  moveTaskToUnDone$: any = this._actions$.pipe(
    ofType(
      moveTaskInTodayList,
      moveTaskToTodayList,
    ),
    filter(({src, target}) => (src === 'DONE' || src === 'BACKLOG') && target === 'UNDONE'),
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
      moveTaskToTodayList,
    ),
    filter(({src, target}) => (src === 'UNDONE' || src === 'BACKLOG') && target === 'DONE'),
    map(({taskId}) => new UpdateTask({
      task: {
        id: taskId,
        changes: {
          isDone: true,
        }
      }
    }))
  );

  @Effect()
  setDefaultProjectId$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.AddTask,
    ),
    concatMap((act: AddTask) => this._globalConfigService.misc$.pipe(
      first(),
      // error handling
      switchMap((miscConfig) => (miscConfig.defaultProjectId
        ? this._projectService.getByIdOnce$(miscConfig.defaultProjectId).pipe(
          tap((project) => {
            if (!project) {
              throw new Error('Default Project not found');
            }
          }),
          mapTo(miscConfig),
        )
        : of(miscConfig))),
      // error handling end
      map(miscCfg => ({
        defaultProjectId: miscCfg.defaultProjectId,
        task: act.payload.task,
      }))
    )),
    filter(({defaultProjectId, task}) => defaultProjectId && !task.projectId && !task.parentId),
    map(({task, defaultProjectId}) => new MoveToOtherProject({
      task,
      targetProjectId: defaultProjectId,
    })),
  );


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _reminderService: ReminderService,
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _globalConfigService: GlobalConfigService,
    private _router: Router,
    private _persistenceService: PersistenceService
  ) {
  }

  private _updateLastLocalSyncModelChange() {
    this._persistenceService.updateLastLocalSyncModelChange();
  }

  private async _removeFromArchive(action: RestoreTask) {
    const task = action.payload.task;
    const taskIds = [task.id, ...task.subTaskIds];
    const currentArchive: TaskArchive = await this._persistenceService.taskArchive.loadState() || createEmptyEntity();
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

    const currentArchive: TaskArchive = await this._persistenceService.taskArchive.loadState() || createEmptyEntity();

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

    return this._persistenceService.taskArchive.saveState(newArchive);
  }

  private _moveToOtherProject(action: MoveToOtherProject) {
    const mainTasks = action.payload.task as TaskWithSubTasks;
    const workContextId = action.payload.targetProjectId;

    if (mainTasks.reminderId) {
      this._reminderService.updateReminder(mainTasks.reminderId, {workContextId});
    }

    if (mainTasks.subTasks) {
      mainTasks.subTasks.forEach((subTask) => {
        if (subTask.reminderId) {
          this._reminderService.updateReminder(subTask.reminderId, {workContextId});
        }
      });
    }
  }
}


