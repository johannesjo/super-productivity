import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';

@Component({
  selector: 'dialog-welcome',
  templateUrl: './dialog-welcome.component.html',
  styleUrls: ['./dialog-welcome.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogWelcomeComponent {
  T: typeof T = T;

  constructor(private _matDialogRef: MatDialogRef<DialogWelcomeComponent>) {}

  close(): void {
    this._matDialogRef.close(true);
  }
}
