import { Injectable, inject } from '@angular/core';
import { AppDataComplete } from '../../imex/sync/sync.model';
import { T } from '../../t.const';
import { TranslateService } from '@ngx-translate/core';
import { dataRepair } from './data-repair.util';
import { isDataRepairPossible } from './is-data-repair-possible.util';
import { getLastValidityError } from '../../imex/sync/is-valid-app-data.util';
import { IS_ELECTRON } from '../../app.constants';

@Injectable({
  providedIn: 'root',
})
export class DataRepairService {
  private _translateService = inject(TranslateService);

  repairData(dataIn: AppDataComplete): AppDataComplete {
    return dataRepair(dataIn);
  }

  isRepairPossibleAndConfirmed(dataIn: AppDataComplete): boolean {
    if (!isDataRepairPossible(dataIn)) {
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
