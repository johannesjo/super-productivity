import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { T } from '../../../t.const';

export type MigrationStatus = 'preparing' | 'backup' | 'migrating' | 'complete' | 'error';

/** afterClosed() value meaning "discard the legacy data and boot empty". */
export const START_FRESH_RESULT = 'START_FRESH';

@Component({
  selector: 'dialog-legacy-migration',
  templateUrl: './dialog-legacy-migration.component.html',
  styleUrls: ['./dialog-legacy-migration.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    TranslateModule,
    MatIcon,
    MatProgressSpinner,
  ],
})
export class DialogLegacyMigrationComponent {
  private _dialogRef = inject(MatDialogRef<DialogLegacyMigrationComponent>);

  T = T;

  status = signal<MigrationStatus>('preparing');
  error = signal<string | null>(null);

  /**
   * Only set by the caller once the pre-migration backup is safely downloaded —
   * starting fresh throws the legacy database away, so it must never be offered
   * for data we have not handed the user a copy of first.
   */
  canStartFresh = signal(false);
  isConfirmingStartFresh = signal(false);

  getStatusKey(): string {
    const statusMap: Record<MigrationStatus, string> = {
      preparing: T.MIGRATE.STATUS_PREPARING,
      backup: T.MIGRATE.STATUS_BACKUP,
      migrating: T.MIGRATE.STATUS_MIGRATING,
      complete: T.MIGRATE.STATUS_COMPLETE,
      error: '', // Error uses the error signal directly
    };
    return statusMap[this.status()];
  }

  hasError(): boolean {
    return this.error() !== null;
  }

  acknowledge(): void {
    this._dialogRef.close();
  }

  startFresh(): void {
    this.isConfirmingStartFresh.set(true);
  }

  cancelStartFresh(): void {
    this.isConfirmingStartFresh.set(false);
  }

  confirmStartFresh(): void {
    this._dialogRef.close(START_FRESH_RESULT);
  }
}
