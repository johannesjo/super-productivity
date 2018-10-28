import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material';
import { SnackParams } from '../snack.model';

@Component({
  selector: 'snack-custom',
  templateUrl: './snack-custom.component.html',
  styleUrls: ['./snack-custom.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnackCustomComponent {
  public snackBarRef: MatSnackBarRef<SnackCustomComponent>;

  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: SnackParams) {
  }

  actionClick() {
    this.snackBarRef.dismissWithAction();
  }
}
