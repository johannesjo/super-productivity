import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from '../../../t.const';
import { SimpleCounter, SimpleCounterType } from '../simple-counter.model';
import { SimpleCounterService } from '../simple-counter.service';
import { getWorklogStr } from '../../../util/get-work-log-str';

@Component({
  selector: 'dialog-simple-counter-edit',
  templateUrl: './dialog-simple-counter-edit.component.html',
  styleUrls: ['./dialog-simple-counter-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogSimpleCounterEditComponent {
  T: typeof T = T;
  SimpleCounterType: typeof SimpleCounterType = SimpleCounterType;

  todayStr: string = getWorklogStr();
  val: number = this.data.simpleCounter.countOnDay[this.todayStr];

  constructor(
    private _matDialogRef: MatDialogRef<DialogSimpleCounterEditComponent>,
    private _simpleCounterService: SimpleCounterService,
    @Inject(MAT_DIALOG_DATA) public data: { simpleCounter: SimpleCounter },
  ) {
  }

  submit() {
    this._simpleCounterService.setCounterToday(this.data.simpleCounter.id, this.val);
    this.close();
  }

  onModelChange($event: number) {
    this.val = $event;
  }

  close() {
    this._matDialogRef.close();
  }
}
