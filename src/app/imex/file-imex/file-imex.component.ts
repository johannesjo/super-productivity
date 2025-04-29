import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { SnackService } from '../../core/snack/snack.service';
import { download } from '../../util/download';
import { T } from '../../t.const';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { Router } from '@angular/router';
import { privacyExport } from './privacy-export';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { AppDataCompleteNew } from '../../pfapi/pfapi-config';
import { PfapiService } from 'src/app/pfapi/pfapi.service';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';

@Component({
  selector: 'file-imex',
  templateUrl: './file-imex.component.html',
  styleUrls: ['./file-imex.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, MatButton, MatTooltip, TranslatePipe],
})
export class FileImexComponent {
  private _snackService = inject(SnackService);
  private _router = inject(Router);
  private _pfapiService = inject(PfapiService);

  readonly fileInputRef = viewChild<ElementRef>('fileInput');
  T: typeof T = T;

  // NOTE: after promise done the file is NOT yet read
  async handleFileInput(ev: any): Promise<void> {
    const files = ev.target.files;
    const file = files.item(0);
    const reader = new FileReader();
    reader.onload = async () => {
      const textData = reader.result;
      console.log(textData);
      let data: AppDataCompleteNew | undefined;
      let oldData;
      try {
        data = oldData = JSON.parse((textData as any).toString());
      } catch (e) {
        this._snackService.open({ type: 'ERROR', msg: T.FILE_IMEX.S_ERR_INVALID_DATA });
      }

      if (!data || !oldData) {
        this._snackService.open({ type: 'ERROR', msg: T.FILE_IMEX.S_ERR_INVALID_DATA });
      } else if (oldData.config && Array.isArray(oldData.tasks)) {
        alert('V1 Data. Migration not supported any more.');
      } else {
        await this._router.navigate([`tag/${TODAY_TAG.id}/tasks`]);
        try {
          await this._pfapiService.importCompleteBackup(data as AppDataCompleteNew);
        } catch (e) {
          this._snackService.open({
            type: 'ERROR',
            msg: T.FILE_IMEX.S_ERR_IMPORT_FAILED,
          });
          return;
        }
      }

      const fileInputRef = this.fileInputRef();
      if (!fileInputRef) {
        throw new Error('No file input Ref element');
      }

      // clear input
      fileInputRef.nativeElement.value = '';
      fileInputRef.nativeElement.type = 'text';
      fileInputRef.nativeElement.type = 'file';
    };
    reader.readAsText(file);
  }

  async downloadBackup(): Promise<void> {
    const data = await this._pfapiService.pf.loadCompleteBackup();
    download('super-productivity-backup.json', JSON.stringify(data));
    if (IS_ANDROID_WEB_VIEW) {
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.FILE_IMEX.S_BACKUP_DOWNLOADED,
      });
    }
    // download('super-productivity-backup.json', privacyExport(data));
  }

  async privacyAppDataDownload(): Promise<void> {
    const data = await this._pfapiService.pf.loadCompleteBackup();
    download('super-productivity-backup.json', privacyExport(data));
    if (IS_ANDROID_WEB_VIEW) {
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.FILE_IMEX.S_BACKUP_DOWNLOADED,
      });
    }
  }
}
