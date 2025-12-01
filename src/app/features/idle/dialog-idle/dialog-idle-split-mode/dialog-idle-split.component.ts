import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Task } from '../../../tasks/task.model';
import { selectIdleTime } from '../../store/idle.selectors';
import { Store } from '@ngrx/store';
import { T } from 'src/app/t.const';
import {
  DialogIdleSplitPassedData,
  DialogIdleSplitReturnData,
  IdleTrackItem,
  SimpleCounterIdleBtn,
} from '../dialog-idle.model';
import { dirtyDeepCopy } from '../../../../util/dirtyDeepCopy';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MsToStringPipe } from '../../../../ui/duration/ms-to-string.pipe';
import { InputDurationSliderComponent } from '../../../../ui/duration/input-duration-slider/input-duration-slider.component';
import { SelectTaskComponent } from '../../../tasks/select-task/select-task.component';

@Component({
  selector: 'dialog-idle-split',
  templateUrl: './dialog-idle-split.component.html',
  styleUrls: ['./dialog-idle-split.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogContent,
    MatButtonToggleGroup,
    FormsModule,
    MatButtonToggle,
    MatIcon,

    MatMiniFabButton,
    MatTooltip,
    MatIconButton,
    MatButton,
    MatDialogActions,
    AsyncPipe,
    TranslatePipe,
    MsToStringPipe,
    InputDurationSliderComponent,
    SelectTaskComponent,
  ],
})
export class DialogIdleSplitComponent implements OnInit {
  private _store = inject(Store);
  private _matDialogRef =
    inject<MatDialogRef<DialogIdleSplitComponent, DialogIdleSplitReturnData>>(
      MatDialogRef,
    );
  private _data = inject<DialogIdleSplitPassedData>(MAT_DIALOG_DATA);

  T: typeof T = T;

  simpleCounterToggleBtns: SimpleCounterIdleBtn[] = this._data.simpleCounterToggleBtns;

  idleTime$ = this._store.select(selectIdleTime);
  trackItems: IdleTrackItem[] = [];

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
