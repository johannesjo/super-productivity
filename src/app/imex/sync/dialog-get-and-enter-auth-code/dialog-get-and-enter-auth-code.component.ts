import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { T } from 'src/app/t.const';

@Component({
  selector: 'dialog-get-and-enter-auth-code',
  templateUrl: './dialog-get-and-enter-auth-code.component.html',
  styleUrls: ['./dialog-get-and-enter-auth-code.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogGetAndEnterAuthCodeComponent {
  T: typeof T = T;
  token?: string;

  constructor(
    private _matDialogRef: MatDialogRef<DialogGetAndEnterAuthCodeComponent>,
    // @ts-ignore
    @Inject(MAT_DIALOG_DATA)
    public data: {
      providerName: string;
      url: string;
    },
  ) {}

  close(token?: string): void {
    this._matDialogRef.close(token);
  }
}
