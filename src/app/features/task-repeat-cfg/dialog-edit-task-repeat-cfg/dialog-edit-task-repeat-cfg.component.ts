import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {Task} from '../../tasks/task.model';
import {TaskService} from '../../tasks/task.service';
import {SnackService} from '../../../core/snack/snack.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {TaskRepeatCfgService} from '../task-repeat-cfg.service';
import {TaskRepeatCfgCopy} from '../task-repeat-cfg.model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'dialog-edit-task-repeat-cfg',
  templateUrl: './dialog-edit-task-repeat-cfg.component.html',
  styleUrls: ['./dialog-edit-task-repeat-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogEditTaskRepeatCfgComponent {
  task: Task = this.data.task;
  title: string = this.task.title;
  taskRepeatCfg$: Observable<TaskRepeatCfgCopy> = this._taskRepeatCfgService.getTaskRepeatCfgById(this.data.task.repeatCfgId);
  isEdit$: Observable<boolean> = this.taskRepeatCfg$.pipe(map(cfg => !!cfg));

  constructor(
    private _taskService: TaskService,
    private _snackService: SnackService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _matDialogRef: MatDialogRef<DialogEditTaskRepeatCfgComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { task: Task },
  ) {
  }

  save() {
    if (this.isEdit$) {
      // this._taskService.updateTaskRepeatCfg(
      //   this.task.id,
      //   this.repeatTaskCfg$.id,
      //   timestamp,
      //   this.title,
      // );
      this.close();
    } else {
      // this._taskService.addTaskRepeatCfg(
      //   this.task.id,
      //   timestamp,
      //   this.title,
      //   this.isMoveToBacklog,
      // );
      this.close();
    }
  }

  remove() {
    // this._taskService.removeTaskRepeatCfg(this.task.id, this.repeatTaskCfg$.id);
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
