import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material';
import { SnackParams } from '../snack.model';
import { TakeABreakService } from '../../../features/time-tracking/take-a-break/take-a-break.service';

@Component({
  selector: 'snack-take-a-break',
  templateUrl: './snack-take-a-break.component.html',
  styleUrls: ['./snack-take-a-break.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnackTakeABreakComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: SnackParams,
    public snackBarRef: MatSnackBarRef<SnackTakeABreakComponent>,
    private _takeABreakService: TakeABreakService,
  ) {
  }

  snooze() {
    this._takeABreakService.snooze();
    this.snackBarRef.dismiss();
  }


  resetTimer() {
    this._takeABreakService.resetTimer();
    this.snackBarRef.dismiss();
  }
}
