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
import { IPC } from '../../../../../electron/ipc-events.const';
import { SimpleCounterService } from '../../simple-counter/simple-counter.service';
import { first } from 'rxjs/operators';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { ElectronService } from '../../../core/electron/electron.service';
import { IS_ELECTRON } from '../../../app.constants';
import { SimpleCounter } from '../../simple-counter/simple-counter.model';
import { Store } from '@ngrx/store';
import { selectIdleTime } from '../store/idle.selectors';
import {
  DialogIdlePassedData,
  DialogIdleReturnData,
  SimpleCounterIdleBtn,
} from './dialog-idle.model';

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
  isSplitMode: boolean = true;

  simpleCounterToggleBtns: SimpleCounterIdleBtn[] = [];

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
    console.log(this.simpleCounterToggleBtns);

    _matDialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this._subs.add(
      this.lastCurrentTask$.subscribe((task) => {
        this.selectedTask = task;
        this.isCreate = false;
      }),
    );

    if (IS_ELECTRON) {
      (this._electronService.ipcRenderer as typeof ipcRenderer).send(
        IPC.FLASH_PROGRESS_BAR,
      );
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
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
    const activatedItemNr = this.simpleCounterToggleBtns.filter(
      (btn) => btn.isTrackTo,
    ).length;
    if (activatedItemNr > 0) {
      this._matDialog
        .open(DialogConfirmComponent, {
          restoreFocus: true,
          data: {
            cancelTxt: T.F.TIME_TRACKING.D_IDLE.SIMPLE_CONFIRM_COUNTER_CANCEL,
            okTxt: T.F.TIME_TRACKING.D_IDLE.SIMPLE_CONFIRM_COUNTER_OK,
            message: T.F.TIME_TRACKING.D_IDLE.SIMPLE_COUNTER_CONFIRM_TXT,
            translateParams: {
              nr: activatedItemNr,
            },
          },
        })
        .afterClosed()
        .subscribe((isConfirm: boolean) => {
          if (isConfirm) {
            this._updateSimpleCounterValues();
          }
        });
    }

    this._matDialogRef.close({
      task: null,
      isResetBreakTimer: true,
      isTrackAsBreak: false,
    });
  }

  trackAsBreak(): void {
    this._updateSimpleCounterValues();

    this._matDialogRef.close({
      task: null,
      isResetBreakTimer: true,
      isTrackAsBreak: true,
    });
  }

  track(isTrackAsBreak: boolean = false): void {
    this._updateSimpleCounterValues();

    this._matDialogRef.close({
      task: this.selectedTask || this.newTaskTitle,
      isTrackAsBreak,
      isResetBreakTimer: isTrackAsBreak,
    });
  }

  private async _updateSimpleCounterValues(): Promise<void> {
    const idleTime = await this.idleTime$.pipe(first()).toPromise();

    this.simpleCounterToggleBtns.forEach((tglBtn) => {
      if (tglBtn.isTrackTo) {
        this._simpleCounterService.increaseCounterToday(tglBtn.id, idleTime);
        if (tglBtn.isWasEnabledBefore) {
          this._simpleCounterService.toggleCounter(tglBtn.id);
        }
      }
    });
  }
}
