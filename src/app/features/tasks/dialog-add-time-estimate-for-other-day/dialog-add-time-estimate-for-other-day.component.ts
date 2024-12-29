import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { T } from '../../../t.const';

interface NewTimeEntry {
  timeSpent: number;
  date: string;
}

@Component({
  selector: 'dialog-time-estimate',
  templateUrl: './dialog-add-time-estimate-for-other-day.component.html',
  styleUrls: ['./dialog-add-time-estimate-for-other-day.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogAddTimeEstimateForOtherDayComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogAddTimeEstimateForOtherDayComponent>>(MatDialogRef);

  T: typeof T = T;
  newEntry: NewTimeEntry;

  constructor() {
    this.newEntry = {
      date: '',
      timeSpent: 0,
    };
  }

  submit(): void {
    this._matDialogRef.close(this.newEntry);
  }
}
