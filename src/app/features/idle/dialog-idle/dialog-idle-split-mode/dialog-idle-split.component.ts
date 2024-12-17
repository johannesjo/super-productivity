import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { Task } from '../../../tasks/task.model';
import { selectIdleTime } from '../../store/idle.selectors';
import { Store } from '@ngrx/store';
import { SimpleCounterService } from '../../../simple-counter/simple-counter.service';
import { T } from 'src/app/t.const';
import {
  DialogIdleSplitPassedData,
  DialogIdleSplitReturnData,
  IdleTrackItem,
  SimpleCounterIdleBtn,
} from '../dialog-idle.model';
import { dirtyDeepCopy } from '../../../../util/dirtyDeepCopy';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'dialog-idle-split',
  templateUrl: './dialog-idle-split.component.html',
  styleUrls: ['./dialog-idle-split.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogIdleSplitComponent implements OnInit {
  T: typeof T = T;

  simpleCounterToggleBtns: SimpleCounterIdleBtn[] = this._data.simpleCounterToggleBtns;

  idleTime$ = this._store.select(selectIdleTime);
  trackItems: IdleTrackItem[] = [];

  constructor(
    private _store: Store,
    private _simpleCounterService: SimpleCounterService,
    private _matDialogRef: MatDialogRef<
      DialogIdleSplitComponent,
      DialogIdleSplitReturnData
    >,
    @Inject(MAT_DIALOG_DATA) private _data: DialogIdleSplitPassedData,
  ) {}

  ngOnInit(): void {
    this.trackItems =
      this._data.prevSelectedTask !== null
        ? [
            {
              type: 'TASK',
              time: 0,
              task: this._data.prevSelectedTask,
              simpleCounterToggleBtns: dirtyDeepCopy(this.simpleCounterToggleBtns),
            },
            {
              type: 'TASK',
              time: 0,
              title: '',
              simpleCounterToggleBtns: dirtyDeepCopy(this.simpleCounterToggleBtns),
            },
          ]
        : [
            {
              type: 'TASK',
              time: 0,
              title: '',
              simpleCounterToggleBtns: dirtyDeepCopy(this.simpleCounterToggleBtns),
            },
            {
              type: 'TASK',
              time: 0,
              title: '',
              simpleCounterToggleBtns: dirtyDeepCopy(this.simpleCounterToggleBtns),
            },
          ];
  }

  onTaskChange(item: IdleTrackItem, taskOrTaskTitle: Task | string): void {
    const isCreate = typeof taskOrTaskTitle === 'string';
    if (isCreate) {
      item.title = taskOrTaskTitle as string;
      item.task = undefined;
    } else {
      item.task = taskOrTaskTitle as Task;
      item.title = undefined;
    }
  }

  addTrackItem(): void {
    this.trackItems.push({
      type: 'TASK',
      time: 0,
      title: '',
      simpleCounterToggleBtns: dirtyDeepCopy(this.simpleCounterToggleBtns),
    });
  }

  removeTrackItem(itemToRemove: IdleTrackItem): void {
    this.trackItems = this.trackItems.filter((item) => item !== itemToRemove);
  }

  save(): void {
    this._matDialogRef.close({ trackItems: this.trackItems });
  }

  cancel(): void {
    this._matDialogRef.close(undefined);
  }
}
