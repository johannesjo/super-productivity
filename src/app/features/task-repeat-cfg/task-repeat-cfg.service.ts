import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {take} from 'rxjs/operators';
import {
    initialTaskRepeatCfgState,
    selectAllTaskRepeatCfgs,
    selectTaskRepeatCfgById,
} from './store/task-repeat-cfg.reducer';
import {
  AddTaskRepeatCfg,
  DeleteTaskRepeatCfg, DeleteTaskRepeatCfgs,
  LoadTaskRepeatCfgState,
  UpdateTaskRepeatCfg,
  UpsertTaskRepeatCfg,
} from './store/task-repeat-cfg.actions';
import {Observable} from 'rxjs';
import {TaskRepeatCfg, TaskRepeatCfgState} from './task-repeat-cfg.model';
import shortid from 'shortid';
import {PersistenceService} from '../../core/persistence/persistence.service';

@Injectable({
    providedIn: 'root',
})
export class TaskRepeatCfgService {
    taskRepeatCfgs$: Observable<TaskRepeatCfg[]> = this._store$.pipe(select(selectAllTaskRepeatCfgs));

    constructor(
        private _store$: Store<TaskRepeatCfgState>,
        private _persistenceService: PersistenceService,
    ) {
    }

    async loadStateForProject(projectId: string) {
        const lsTaskRepeatCfgState = await this._persistenceService.taskRepeatCfg.load(projectId);
        this.loadState(lsTaskRepeatCfgState || initialTaskRepeatCfgState);
    }

    getTaskRepeatCfgById(id: string): Observable<TaskRepeatCfg> {
      return this._store$.pipe(select(selectTaskRepeatCfgById, {id}), take(1));
    }

    loadState(state: TaskRepeatCfgState) {
        this._store$.dispatch(new LoadTaskRepeatCfgState({state}));
    }

    addTaskRepeatCfg(taskRepeatCfg: TaskRepeatCfg) {
        this._store$.dispatch(new AddTaskRepeatCfg({
            taskRepeatCfg: {
                ...taskRepeatCfg,
                id: shortid()
            }
        }));
    }

    deleteTaskRepeatCfg(id: string) {
        this._store$.dispatch(new DeleteTaskRepeatCfg({id}));
    }

    deleteTaskRepeatCfgs(ids: string[]) {
        this._store$.dispatch(new DeleteTaskRepeatCfgs({ids}));
    }

    updateTaskRepeatCfg(id: string, changes: Partial<TaskRepeatCfg>) {
        this._store$.dispatch(new UpdateTaskRepeatCfg({taskRepeatCfg: {id, changes}}));
    }

    upsertTaskRepeatCfg(metric: TaskRepeatCfg) {
      this._store$.dispatch(new UpsertTaskRepeatCfg({metric}));
    }
}
