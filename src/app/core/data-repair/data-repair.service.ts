import { inject, Injectable } from '@angular/core';
import { AppDataCompleteLegacy } from '../../imex/sync/sync.model';
import { T } from '../../t.const';
import { TranslateService } from '@ngx-translate/core';
import { isDataRepairPossible } from '../../pfapi/repair/is-data-repair-possible.util';
import { getLastValidityError } from '../../pfapi/validate/is-related-model-data-valid';
import { IS_ELECTRON } from '../../app.constants';
import { AppDataCompleteNew } from '../../pfapi/pfapi-config';
import { Log } from '../log';

@Injectable({
  providedIn: 'root',
})
export class DataRepairService {
  private _translateService = inject(TranslateService);

  isRepairPossibleAndConfirmed(
    dataIn: AppDataCompleteLegacy | AppDataCompleteNew,
  ): boolean {
    if (!isDataRepairPossible(dataIn)) {
      Log.log({ dataIn });
      alert('Data damaged, repair not possible.');
      return false;
    }
    const isConfirmed = confirm(
      this._translateService.instant(T.CONFIRM.AUTO_FIX, {
        validityError: getLastValidityError() || 'Unknown validity error',
      }),
    );
    if (IS_ELECTRON && !isConfirmed) {
      window.ea.shutdownNow();
    }

    return isConfirmed;
  }
}
