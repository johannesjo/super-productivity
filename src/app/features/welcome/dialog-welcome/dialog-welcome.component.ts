import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { IS_TOUCH_ONLY } from '../../../util/is-touch-only';

@Component({
  selector: 'dialog-welcome',
  templateUrl: './dialog-welcome.component.html',
  styleUrls: ['./dialog-welcome.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogWelcomeComponent {
  T: typeof T = T;
  IS_TOUCH_ONLY = IS_TOUCH_ONLY;

  constructor(private _matDialogRef: MatDialogRef<DialogWelcomeComponent>) {}

  close(): void {
    this._matDialogRef.close(true);
  }
}
