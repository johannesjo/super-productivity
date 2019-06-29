import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {concatMap, filter, flatMap, take, tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {DeleteTaskRepeatCfg, TaskRepeatCfgActionTypes} from './task-repeat-cfg.actions';
import {selectTaskRepeatCfgFeatureState} from './task-repeat-cfg.reducer';
import {selectCurrentProjectId} from '../../project/store/project.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {selectTasksByRepeatConfigId} from '../../tasks/store/task.selectors';
import {Task, TaskArchive, TaskWithSubTasks} from '../../tasks/task.model';
import {UpdateTask} from '../../tasks/store/task.actions';
import {TaskService} from '../../tasks/task.service';

@Injectable()
export class TaskRepeatCfgEffects {

  @Effect({dispatch: false}) updateTaskRepeatCfgs$: any = this._actions$
    .pipe(
      ofType(
        TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask,
        TaskRepeatCfgActionTypes.UpdateTaskRepeatCfg,
        TaskRepeatCfgActionTypes.UpsertTaskRepeatCfg,
        TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg,
        TaskRepeatCfgActionTypes.DeleteTaskRepeatCfgs,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectTaskRepeatCfgFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );


  @Effect() removeConfigIdFromTaskStateTasks$: any = this._actions$
    .pipe(
      ofType(
        TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg,
      ),
      concatMap((action: DeleteTaskRepeatCfg) =>
        this._store$.pipe(
          select(selectTasksByRepeatConfigId, {repeatCfgId: action.payload.id}),
          take(1)),
      ),
      filter(tasks => tasks && !!tasks.length),
      flatMap((tasks: Task[]) => tasks.map(task => new UpdateTask({
        task: {
          id: task.id,
          changes: {repeatCfgId: null}
        }
      }))),
    );

  @Effect({dispatch: false}) removeConfigIdFromTaskArchiveTasks$: any = this._actions$
    .pipe(
      ofType(
        TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
      ),
      tap(([a, projectId]: [DeleteTaskRepeatCfg, string]) => {
        this._removeRepeatCfgFromArchiveTasks.bind(this)(a.payload.id, projectId);
      }),
    );


  constructor(
    private _actions$: Actions,
    private _taskService: TaskService,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, taskRepeatCfgState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.taskRepeatCfg.save(currentProjectId, taskRepeatCfgState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _removeRepeatCfgFromArchiveTasks(repeatConfigId: string, projectId: string) {
    this._persistenceService.taskArchive.load(projectId).then((taskArchive: TaskArchive) => {
      const newState = {...taskArchive};
      const ids = newState.ids as string[];
      const tasksWithRepeatCfgId = ids.map(id => newState.entities[id])
        .filter((task: TaskWithSubTasks) => task.repeatCfgId === repeatConfigId);
      console.log(tasksWithRepeatCfgId);

      if (tasksWithRepeatCfgId && tasksWithRepeatCfgId.length) {
        tasksWithRepeatCfgId.forEach((task: any) => task.repeatCfgId = null);
        this._persistenceService.taskArchive.save(projectId, newState);
      }
    });
  }

}
