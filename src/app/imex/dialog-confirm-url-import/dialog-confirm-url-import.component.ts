import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core'; // For translate pipe
import { T } from '../../t.const';
import { Log } from '../../core/log';

export interface DialogConfirmUrlImportData {
  domain: string;
}

@Component({
  selector: 'dialog-confirm-url-import',
  templateUrl: './dialog-confirm-url-import.component.html',
  styleUrls: ['./dialog-confirm-url-import.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    TranslateModule, // Add TranslateModule for the pipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmUrlImportDialogComponent {
  T = T;
  data: DialogConfirmUrlImportData = inject(MAT_DIALOG_DATA);
  private _matDialogRef = inject(MatDialogRef<ConfirmUrlImportDialogComponent>);

  constructor() {
    if (!this.data || !this.data.domain) {
      Log.err('ConfirmUrlImportDialogComponent: No URL provided in dialog data.');
      // Optionally close dialog or handle error, for now, it will show undefined in template
    }
  }

  onConfirm(): void {
    this._matDialogRef.close(true);
  }

  onCancel(): void {
    this._matDialogRef.close(false);
  }
}
