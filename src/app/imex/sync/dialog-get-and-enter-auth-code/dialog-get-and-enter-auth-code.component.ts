import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'dialog-get-and-enter-auth-code',
  templateUrl: './dialog-get-and-enter-auth-code.component.html',
  styleUrls: ['./dialog-get-and-enter-auth-code.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatAnchor,
    MatIcon,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatInput,
    FormsModule,
    MatDialogActions,
    MatButton,
    TranslatePipe,
  ],
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

  constructor() {
    this._matDialogRef.disableClose = true;
  }

  close(token?: string): void {
    this._matDialogRef.close(token);
  }
}
