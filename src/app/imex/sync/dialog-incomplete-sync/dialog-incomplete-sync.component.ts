import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { download } from '../../../util/download';
import { DataImportService } from '../data-import.service';

import { IS_ELECTRON } from '../../../app.constants';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';

export interface DialogIncompleteSyncData {
  archiveRevInMainFile?: string;
  archiveRevReal?: string;
}

@Component({
  selector: 'dialog-incomplete-sync',
  imports: [
    MatDialogContent,
    TranslateModule,
    FormsModule,
    MatIcon,
    MatDialogActions,
    MatButton,
  ],
  templateUrl: './dialog-incomplete-sync.component.html',
  styleUrl: './dialog-incomplete-sync.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogIncompleteSyncComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogIncompleteSyncComponent>>(MatDialogRef);
  private _dataImportService = inject(DataImportService);
  data? = inject<DialogIncompleteSyncData>(MAT_DIALOG_DATA);

  T: typeof T = T;
  IS_ANDROID_WEB_VIEW = IS_ANDROID_WEB_VIEW;

  constructor() {
    const _matDialogRef = this._matDialogRef;

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
