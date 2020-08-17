import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  selectAllTaskRepeatCfgs,
  selectTaskRepeatCfgById,
  selectTaskRepeatCfgByIdAllowUndefined
} from './store/task-repeat-cfg.reducer';
import {
  AddTaskRepeatCfgToTask,
  DeleteTaskRepeatCfg,
  DeleteTaskRepeatCfgs,
  UpdateTaskRepeatCfg,
  UpdateTaskRepeatCfgs,
  UpsertTaskRepeatCfg,
} from './store/task-repeat-cfg.actions';
import { Observable } from 'rxjs';
import { TaskRepeatCfg, TaskRepeatCfgCopy, TaskRepeatCfgState } from './task-repeat-cfg.model';
import * as shortid from 'shortid';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { T } from '../../t.const';

@Injectable({
  providedIn: 'root',
})
export class TaskRepeatCfgService {
  taskRepeatCfgs$: Observable<TaskRepeatCfg[]> = this._store$.pipe(select(selectAllTaskRepeatCfgs));

  constructor(
    private _store$: Store<TaskRepeatCfgState>,
    private _matDialog: MatDialog,
  ) {
  }

  getTaskRepeatCfgById$(id: string): Observable<TaskRepeatCfg> {
    return this._store$.pipe(select(selectTaskRepeatCfgById, {id}));
  }
  getTaskRepeatCfgByIdAllowUndefined$(id: string): Observable<TaskRepeatCfg|undefined> {
    return this._store$.pipe(select(selectTaskRepeatCfgByIdAllowUndefined, {id}));
  }

  addTaskRepeatCfgToTask(taskId: string, projectId: string | null, taskRepeatCfg: Omit<TaskRepeatCfgCopy, 'id'>) {
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
}
