import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TaskService } from '../../tasks/task.service';
import { Observable } from 'rxjs';
import { Task } from '../../tasks/task.model';
import { GlobalConfigService } from '../../config/global-config.service';
import { T } from '../../../t.const';
import { ElectronService } from 'src/app/core/electron/electron.service';
import { ipcRenderer } from 'electron';
import { IPC } from '../../../../../electron/ipc-events.const';
import { IS_ELECTRON } from 'src/app/app.constants';

@Component({
  selector: 'dialog-idle',
  templateUrl: './dialog-idle.component.html',
  styleUrls: ['./dialog-idle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogIdleComponent implements OnInit {
  T: typeof T = T;
  lastCurrentTask$: Observable<Task> = this._taskService.getByIdOnce$(
    this.data.lastCurrentTaskId,
  );
  selectedTask: Task | null = null;
  newTaskTitle?: string;
  isCreate?: boolean;

  constructor(
    public configService: GlobalConfigService,
    private _taskService: TaskService,
    private _matDialogRef: MatDialogRef<DialogIdleComponent>,
    private _electronService: ElectronService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    _matDialogRef.disableClose = true;
  }

  ngOnInit() {
    this.lastCurrentTask$.subscribe((task) => {
      this.selectedTask = task;
      this.isCreate = false;
    });

    if (IS_ELECTRON) {
      (this._electronService.ipcRenderer as typeof ipcRenderer).send(
        IPC.FLASH_PROGRESS_BAR,
      );
    }
  }

  onTaskChange(taskOrTaskTitle: Task | string) {
    this.isCreate = typeof taskOrTaskTitle === 'string';
    if (this.isCreate) {
      this.newTaskTitle = taskOrTaskTitle as string;
      this.selectedTask = null;
    } else {
      this.selectedTask = taskOrTaskTitle as Task;
      this.newTaskTitle = undefined;
    }
  }

  skipTrack() {
    this._matDialogRef.close({
      task: null,
      isResetBreakTimer: true,
    });
  }

  trackAsBreak() {
    this._matDialogRef.close({
      task: null,
      isResetBreakTimer: true,
      isTrackAsBreak: true,
    });
  }

  track(isTrackAsBreak: boolean = false) {
    this._matDialogRef.close({
      task: this.selectedTask || this.newTaskTitle,
      isTrackAsBreak,
      isResetBreakTimer: isTrackAsBreak,
    });
  }
}
