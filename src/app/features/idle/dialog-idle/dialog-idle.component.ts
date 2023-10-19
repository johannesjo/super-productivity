import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TaskService } from '../../tasks/task.service';
import { EMPTY, Observable, Subscription } from 'rxjs';
import { Task } from '../../tasks/task.model';
import { GlobalConfigService } from '../../config/global-config.service';
import { T } from '../../../t.const';
import { ipcRenderer } from 'electron';
import { IPC } from '../../../../../electron/shared-with-frontend/ipc-events.const';
import { SimpleCounterService } from '../../simple-counter/simple-counter.service';
import { ElectronService } from '../../../core/electron/electron.service';
import { IS_ELECTRON } from '../../../app.constants';
import { SimpleCounter } from '../../simple-counter/simple-counter.model';
import { Store } from '@ngrx/store';
import { selectIdleTime } from '../store/idle.selectors';
import {
  DialogIdlePassedData,
  DialogIdleReturnData,
  DialogIdleSplitPassedData,
  DialogIdleSplitReturnData,
  SimpleCounterIdleBtn,
} from './dialog-idle.model';
import { DialogIdleSplitComponent } from './dialog-idle-split-mode/dialog-idle-split.component';

@Component({
  selector: 'dialog-idle',
  templateUrl: './dialog-idle.component.html',
  styleUrls: ['./dialog-idle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogIdleComponent implements OnInit, OnDestroy {
  T: typeof T = T;

  lastCurrentTask$: Observable<Task> = this.data.lastCurrentTaskId
    ? this._taskService.getByIdOnce$(this.data.lastCurrentTaskId)
    : EMPTY;

  idleTime$ = this._store.select(selectIdleTime);

  selectedTask: Task | null = null;
  newTaskTitle?: string;
  isCreate?: boolean;
  isSplitMode: boolean = false;

  simpleCounterToggleBtns: SimpleCounterIdleBtn[] = [];
  isTaskDataLoadedIfNeeded: boolean = !this.data.lastCurrentTaskId;

  private _subs = new Subscription();

  constructor(
    public configService: GlobalConfigService,
    private _taskService: TaskService,
    private _matDialogRef: MatDialogRef<DialogIdleComponent, DialogIdleReturnData>,
    private _matDialog: MatDialog,
    private _electronService: ElectronService,
    private _store: Store,
    private _simpleCounterService: SimpleCounterService,
    @Inject(MAT_DIALOG_DATA) public data: DialogIdlePassedData,
  ) {
    this.simpleCounterToggleBtns = (
      data.enabledSimpleStopWatchCounters as SimpleCounter[]
    ).map(
      ({ id, icon, iconOn, title, isOn }: SimpleCounter): SimpleCounterIdleBtn =>
        ({
          id,
          icon: iconOn || icon,
          title,
          isTrackTo: isOn,
          isWasEnabledBefore: isOn,
        } as SimpleCounterIdleBtn),
    );
    _matDialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this._subs.add(
      this.lastCurrentTask$.subscribe((task) => {
        this.selectedTask = task;
        this.isCreate = false;
        this.isTaskDataLoadedIfNeeded = true;
      }),
    );

    if (IS_ELECTRON) {
      (this._electronService.ipcRenderer as typeof ipcRenderer).send(IPC.FLASH_FRAME);
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  showSplit(): void {
    this._matDialog
      .open<
        DialogIdleSplitComponent,
        DialogIdleSplitPassedData,
        DialogIdleSplitReturnData | undefined
      >(DialogIdleSplitComponent, {
        data: {
          simpleCounterToggleBtns: this.simpleCounterToggleBtns,
          prevSelectedTask: this.selectedTask,
          newTaskTitle: this.newTaskTitle,
        },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res) {
          this._matDialogRef.close({
            trackItems: res.trackItems,
          });
        }
      });
  }

  onTaskChange(taskOrTaskTitle: Task | string): void {
    this.isCreate = typeof taskOrTaskTitle === 'string';
    if (this.isCreate) {
      this.newTaskTitle = taskOrTaskTitle as string;
      this.selectedTask = null;
    } else {
      this.selectedTask = taskOrTaskTitle as Task;
      this.newTaskTitle = undefined;
    }
  }

  skipTrack(): void {
    this._matDialogRef.close({
      trackItems: [],
      simpleCounterToggleBtnsWhenNoTrackItems: this.simpleCounterToggleBtns,
    });
  }

  trackAsBreak(): void {
    this._matDialogRef.close({
      trackItems: [
        {
          type: 'BREAK',
          time: 'IDLE_TIME',
          simpleCounterToggleBtns: this.simpleCounterToggleBtns,
        },
      ],
    });
  }

  track(isTrackAsBreak: boolean = false): void {
    this._matDialogRef.close({
      trackItems: [
        {
          type: isTrackAsBreak ? 'TASK_AND_BREAK' : 'TASK',
          time: 'IDLE_TIME',
          simpleCounterToggleBtns: this.simpleCounterToggleBtns,
          ...(this.isCreate
            ? { title: this.newTaskTitle as string }
            : { task: this.selectedTask as Task }),
        },
      ],
    });
  }
}
