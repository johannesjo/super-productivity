import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
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
  imports: [
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatIcon,
    TranslatePipe,
    MatDialogTitle,
  ],
})
export class DialogConfirmComponent {
  private readonly _matDialogRef =
    inject<MatDialogRef<DialogConfirmComponent>>(MatDialogRef);
  readonly data = inject(MAT_DIALOG_DATA);

  readonly cancelButton = viewChild<MatButton>('cancelButton');

  readonly T: typeof T = T;

  close(res: boolean | string | undefined): void {
    this._matDialogRef.close(res);
  }

  focusNextButton(nextButton: MatButton): void {
    const buttonElement = nextButton._elementRef.nativeElement;
    if (buttonElement) {
      buttonElement.focus();
    }
  }

  focusCancelButton(): void {
    const btn = this.cancelButton();
    if (btn) {
      btn._elementRef.nativeElement.focus();
    }
  }
}
