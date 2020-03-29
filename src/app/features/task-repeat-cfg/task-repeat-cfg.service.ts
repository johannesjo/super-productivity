import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {
  initialTaskRepeatCfgState,
  selectAllTaskRepeatCfgs,
  selectTaskRepeatCfgById,
} from './store/task-repeat-cfg.reducer';
import {
  AddTaskRepeatCfgToTask,
  DeleteTaskRepeatCfg,
  DeleteTaskRepeatCfgs,
  LoadTaskRepeatCfgState,
  UpdateTaskRepeatCfg,
  UpdateTaskRepeatCfgs,
  UpsertTaskRepeatCfg,
} from './store/task-repeat-cfg.actions';
import {Observable} from 'rxjs';
import {TaskRepeatCfg, TaskRepeatCfgState} from './task-repeat-cfg.model';
import shortid from 'shortid';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {DialogConfirmComponent} from '../../ui/dialog-confirm/dialog-confirm.component';
import {MatDialog} from '@angular/material/dialog';
import {T} from '../../t.const';

@Injectable({
  providedIn: 'root',
})
export class TaskRepeatCfgService {
  taskRepeatCfgs$: Observable<TaskRepeatCfg[]> = this._store$.pipe(select(selectAllTaskRepeatCfgs));

  constructor(
    private _store$: Store<TaskRepeatCfgState>,
    private _persistenceService: PersistenceService,
    private _matDialog: MatDialog,
  ) {
  }

  async load() {
    const lsTaskRepeatCfgState = await this._persistenceService.taskRepeatCfg.loadState();
    this._loadState(lsTaskRepeatCfgState || initialTaskRepeatCfgState);
  }

  getTaskRepeatCfgById$(id: string): Observable<TaskRepeatCfg> {
    return this._store$.pipe(select(selectTaskRepeatCfgById, {id}));
  }

  addTaskRepeatCfgToTask(taskId: string, projectId: string, taskRepeatCfg: TaskRepeatCfg) {
    this._store$.dispatch(new AddTaskRepeatCfgToTask({
      taskRepeatCfg: {
        ...taskRepeatCfg,
        projectId,
        id: shortid()
      },
      taskId,
    }));
  }

  deleteTaskRepeatCfg(id: string) {
    this._store$.dispatch(new DeleteTaskRepeatCfg({id}));
  }

  deleteTaskRepeatCfgsNoTaskCleanup(ids: string[]) {
    this._store$.dispatch(new DeleteTaskRepeatCfgs({ids}));
  }

  updateTaskRepeatCfg(id: string, changes: Partial<TaskRepeatCfg>) {
    this._store$.dispatch(new UpdateTaskRepeatCfg({taskRepeatCfg: {id, changes}}));
  }

  updateTaskRepeatCfgs(ids: string[], changes: Partial<TaskRepeatCfg>) {
    this._store$.dispatch(new UpdateTaskRepeatCfgs({ids, changes}));
  }

  upsertTaskRepeatCfg(taskRepeatCfg: TaskRepeatCfg) {
    this._store$.dispatch(new UpsertTaskRepeatCfg({taskRepeatCfg}));
  }

  deleteTaskRepeatCfgWithDialog(id: string) {
    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        message: T.F.TASK_REPEAT.D_CONFIRM_REMOVE.MSG,
        okTxt: T.F.TASK_REPEAT.D_CONFIRM_REMOVE.OK,
      }
    }).afterClosed()
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          this.deleteTaskRepeatCfg(id);
        }
      });
  }

  private _loadState(state: TaskRepeatCfgState) {
    this._store$.dispatch(new LoadTaskRepeatCfgState({state}));
  }
}
