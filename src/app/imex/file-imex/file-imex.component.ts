import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import { SyncService } from '../sync/sync.service';
import { SnackService } from '../../core/snack/snack.service';
import { AppDataComplete } from '../sync/sync.model';
import { OldDataExport } from '../migrate/migrate.model';
import { MigrateService } from '../migrate/migrate.service';

@Component({
  selector: 'file-imex',
  templateUrl: './file-imex.component.html',
  styleUrls: ['./file-imex.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileImexComponent {
  @ViewChild('exportDataBtn', {read: ElementRef}) exportDataBtn: ElementRef;
  importDataString: string;

  constructor(
    private _syncService: SyncService,
    private _migrateService: MigrateService,
    private _snackService: SnackService,
  ) {
  }

  importData() {
    if (this.importDataString && this.importDataString.length > 0) {
      let data: AppDataComplete;
      let oldData: OldDataExport;
      try {
        data = oldData = JSON.parse(this.importDataString);
      } catch (e) {
        this._snackService.open({type: 'ERROR', message: 'Import failed: Invalid JSON'});
      }

      if (oldData.config && Array.isArray(oldData.tasks)) {
        this._migrateService.migrateData(oldData);
      } else {
        this._syncService.loadCompleteSyncData(data);
      }
    }
  }

  async downloadBackup() {
    const el = this.exportDataBtn.nativeElement;
    const data = await this._syncService.getCompleteSyncData();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));

    el.setAttribute('href', dataStr);
    el.setAttribute('download', 'super-productivity-backup.json');
  }

}
