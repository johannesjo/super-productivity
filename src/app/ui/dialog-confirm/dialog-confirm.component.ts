import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { T } from '../../t.const';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'dialog-confirm',
  templateUrl: './dialog-confirm.component.html',
  styleUrls: ['./dialog-confirm.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogContent, MatDialogActions, MatButton, MatIcon, TranslatePipe],
})
export class DialogConfirmComponent {
  private _matDialogRef = inject<MatDialogRef<DialogConfirmComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  T: typeof T = T;

  close(res: any): void {
    this._matDialogRef.close(res);
  }
}
