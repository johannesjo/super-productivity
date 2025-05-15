import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { download } from '../../../util/download';

import { IS_ELECTRON } from '../../../app.constants';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { T } from '../../../t.const';

export interface DialogIncompleteSyncData {
  modelId: string;
}

@Component({
  selector: 'dialog-incoherent-timestamps-error',
  imports: [
    MatDialogContent,
    TranslateModule,
    FormsModule,
    MatIcon,
    MatDialogActions,
    MatButton,
  ],
  templateUrl: './dialog-incoherent-timestamps-error.component.html',
  styleUrl: './dialog-incoherent-timestamps-error.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogIncoherentTimestampsErrorComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogIncoherentTimestampsErrorComponent>>(MatDialogRef);
  private _pfapiService = inject(PfapiService);

  data = inject<DialogIncompleteSyncData>(MAT_DIALOG_DATA);

  T: typeof T = T;
  IS_ANDROID_WEB_VIEW = IS_ANDROID_WEB_VIEW;

  constructor() {
    const _matDialogRef = this._matDialogRef;
    _matDialogRef.disableClose = true;
  }

  async downloadBackup(): Promise<void> {
    const data = await this._pfapiService.pf.loadCompleteBackup();
    download('super-productivity-backup.json', JSON.stringify(data));
    // download('super-productivity-backup.json', privacyExport(data));
  }

  close(res?: 'FORCE_UPDATE_REMOTE' | 'FORCE_UPDATE_LOCAL'): void {
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
