import {ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {Task} from '../../tasks/task.model';
import {TaskService} from '../../tasks/task.service';
import {SnackService} from '../../../core/snack/snack.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TaskRepeatCfgService} from '../task-repeat-cfg.service';
import {DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfgCopy} from '../task-repeat-cfg.model';
import {Subscription} from 'rxjs';
import {FormlyFieldConfig, FormlyFormOptions} from '@ngx-formly/core';
import {FormGroup} from '@angular/forms';
import {TASK_REPEAT_CFG_FORM_CFG} from './task-repeat-cfg-form.const';
import {T} from '../../../t.const';

// TASK_REPEAT_CFG_FORM_CFG
@Component({
  selector: 'dialog-edit-task-repeat-cfg',
  templateUrl: './dialog-edit-task-repeat-cfg.component.html',
  styleUrls: ['./dialog-edit-task-repeat-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogEditTaskRepeatCfgComponent implements OnInit, OnDestroy {
  T = T;
  task: Task = this.data.task;

  taskRepeatCfg: TaskRepeatCfgCopy = {
    ...DEFAULT_TASK_REPEAT_CFG,
    title: this.task.title,
  };

  taskRepeatCfgId: string = this.task.repeatCfgId;
  isEdit: boolean = !!this.taskRepeatCfgId;

  fields: FormlyFieldConfig[] = TASK_REPEAT_CFG_FORM_CFG;
  form = new FormGroup({});
  options: FormlyFormOptions = {};

  private _subs = new Subscription();


  constructor(
    private _taskService: TaskService,
    private _snackService: SnackService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _matDialogRef: MatDialogRef<DialogEditTaskRepeatCfgComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { task: Task },
  ) {
  }

  ngOnInit(): void {
    if (this.isEdit) {
      this._subs.add(this._taskRepeatCfgService.getTaskRepeatCfgById$(this.task.repeatCfgId).subscribe((cfg) => {
        this.taskRepeatCfg = cfg;
      }));
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  save() {
    if (this.isEdit) {
      this._taskRepeatCfgService.updateTaskRepeatCfg(this.taskRepeatCfgId, this.taskRepeatCfg);
      this.close();
    } else {
      this._taskRepeatCfgService.addTaskRepeatCfgToTask(this.task.id, this.taskRepeatCfg);
      this.close();
    }
  }

  remove() {
    this._taskRepeatCfgService.deleteTaskRepeatCfgWithDialog(this.task.repeatCfgId);
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
