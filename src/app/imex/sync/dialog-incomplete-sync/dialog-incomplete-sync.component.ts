import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { TranslateModule } from '@ngx-translate/core';
import { UiModule } from '../../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { download } from '../../../util/download';
import { DataImportService } from '../data-import.service';

import { IS_ELECTRON } from '../../../app.constants';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';

export interface DialogIncompleteSyncData {
  archiveRevInMainFile?: string;
  archiveRevReal?: string;
}

@Component({
  selector: 'dialog-incomplete-sync',
  imports: [MatDialogContent, TranslateModule, UiModule, FormsModule],
  templateUrl: './dialog-incomplete-sync.component.html',
  styleUrl: './dialog-incomplete-sync.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogIncompleteSyncComponent {
  T: typeof T = T;
  IS_ANDROID_WEB_VIEW = IS_ANDROID_WEB_VIEW;

  constructor(
    private _matDialogRef: MatDialogRef<DialogIncompleteSyncComponent>,
    private _dataImportService: DataImportService,
    @Inject(MAT_DIALOG_DATA)
    public data?: DialogIncompleteSyncData,
  ) {
    _matDialogRef.disableClose = true;
  }

  async downloadBackup(): Promise<void> {
    const data = await this._dataImportService.getCompleteSyncData();
    download('super-productivity-backup.json', JSON.stringify(data));
    // download('super-productivity-backup.json', privacyExport(data));
  }

  close(res?: 'FORCE_UPDATE_REMOTE'): void {
    this._matDialogRef.close(res);
  }

  closeApp(): void {
    if (IS_ELECTRON) {
      window.ea.shutdownNow();
    } else {
      window.close();
    }
  }
}
