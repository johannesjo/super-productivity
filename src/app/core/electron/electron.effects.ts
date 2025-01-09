import { Injectable, inject } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { IS_ELECTRON } from '../../app.constants';
import { tap } from 'rxjs/operators';
import { SnackService } from '../snack/snack.service';
import { T } from '../../t.const';
import { ipcAnyFileDownloaded$ } from '../ipc-events';

@Injectable()
export class ElectronEffects {
  private _snackService = inject(SnackService);

  fileDownloadedSnack$: Observable<unknown> | false =
    IS_ELECTRON &&
    createEffect(
      () =>
        ipcAnyFileDownloaded$.pipe(
          tap((args) => {
            const fileParam = (args as any)[1];
            const path = fileParam.path;
            const fileName = path.replace(/^.*[\\\/]/, '');
            const dir = path.replace(/[^\/]*$/, '');
            this._snackService.open({
              ico: 'file_download',
              // ico: 'file_download_done',
              // ico: 'download_done',
              msg: T.GLOBAL_SNACK.FILE_DOWNLOADED,
              translateParams: {
                fileName,
              },
              actionStr: T.GLOBAL_SNACK.FILE_DOWNLOADED_BTN,
              actionFn: () => {
                window.ea.openPath(dir);
              },
            });
          }),
        ),
      { dispatch: false },
    );
}
