import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material';
import { SnackParams } from '../snack.model';

@Component({
  selector: 'snack-custom',
  templateUrl: './snack-custom.component.html',
  styleUrls: ['./snack-custom.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnackCustomComponent implements OnInit {

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: SnackParams,
    public snackBarRef: MatSnackBarRef<SnackCustomComponent>,
  ) {
  }

  ngOnInit() {
    if (this.data.promise) {
      this.data.promise.then(() => {
        // this.snackBarRef.dismiss();
      });
    }
  }

  actionClick() {
    this.snackBarRef.dismissWithAction();
  }
}
