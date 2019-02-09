import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material';
import { SnackParams } from '../snack.model';

@Component({
  selector: 'snack-global-error',
  templateUrl: './snack-global-error.component.html',
  styleUrls: ['./snack-global-error.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnackGlobalErrorComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: SnackParams,
    public snackBarRef: MatSnackBarRef<SnackGlobalErrorComponent>,
  ) {
  }

  reloadApp() {
    window.location.reload();
  }

  dismiss() {
    this.snackBarRef.dismissWithAction();
  }
}
