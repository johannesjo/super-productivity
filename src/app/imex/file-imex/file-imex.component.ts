import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import { DataImportService } from '../sync/data-import.service';
import { SnackService } from '../../core/snack/snack.service';
import { AppDataComplete } from '../sync/sync.model';
import { download } from '../../util/download';
import { T } from '../../t.const';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { Router } from '@angular/router';

@Component({
  selector: 'file-imex',
  templateUrl: './file-imex.component.html',
  styleUrls: ['./file-imex.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileImexComponent {
  @ViewChild('fileInput', {static: true}) fileInputRef?: ElementRef;
  T: typeof T = T;

  constructor(
    private _dataImportService: DataImportService,
    private _snackService: SnackService,
    private _router: Router,
  ) {
  }

  async handleFileInput(ev: any) {
    const files = ev.target.files;
    const file = files.item(0);
    const reader = new FileReader();
    reader.onload = async () => {
      const textData = reader.result;
      console.log(textData);
      let data: AppDataComplete | undefined;
      let oldData;
      try {
        data = oldData = JSON.parse((textData as any).toString());
      } catch (e) {
        this._snackService.open({type: 'ERROR', msg: T.FILE_IMEX.S_ERR_INVALID_DATA});
      }

      if (oldData.config && Array.isArray(oldData.tasks)) {
        alert('V1 Data. Migration not imported any more.');
      } else {
        await this._router.navigate([`tag/${TODAY_TAG.id}/tasks`]);
        await this._dataImportService.importCompleteSyncData(data as AppDataComplete);
      }

      if (!this.fileInputRef) {
        throw new Error();
      }

      // clear input
      this.fileInputRef.nativeElement.value = '';
      this.fileInputRef.nativeElement.type = 'text';
      this.fileInputRef.nativeElement.type = 'file';
    };
    reader.readAsText(file);
  }

  async downloadBackup() {
    const data = await this._dataImportService.getCompleteSyncData();
    download('super-productivity-backup.json', JSON.stringify(data));
  }
}
