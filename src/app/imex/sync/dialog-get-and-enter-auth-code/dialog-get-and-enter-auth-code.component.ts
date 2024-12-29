import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';

@Component({
  selector: 'dialog-get-and-enter-auth-code',
  templateUrl: './dialog-get-and-enter-auth-code.component.html',
  styleUrls: ['./dialog-get-and-enter-auth-code.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogGetAndEnterAuthCodeComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogGetAndEnterAuthCodeComponent>>(MatDialogRef);
  data = inject<{
    providerName: string;
    url: string;
  }>(MAT_DIALOG_DATA);

  T: typeof T = T;
  token?: string;

  close(token?: string): void {
    this._matDialogRef.close(token);
  }
}
