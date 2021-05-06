import { Injectable } from '@angular/core';
import { AppDataComplete } from '../../imex/sync/sync.model';
import { T } from '../../t.const';
import { TranslateService } from '@ngx-translate/core';
import { dataRepair } from './data-repair.util';
import { isDataRepairPossible } from './is-data-repair-possible.util';

@Injectable({
  providedIn: 'root',
})
export class DataRepairService {
  constructor(private _translateService: TranslateService) {}

  repairData(dataIn: AppDataComplete): AppDataComplete {
    return dataRepair(dataIn);
  }

  isRepairPossibleAndConfirmed(dataIn: AppDataComplete): boolean {
    if (!isDataRepairPossible(dataIn)) {
      alert('Data damaged, repair not possible.');
      return false;
    }
    return confirm(this._translateService.instant(T.CONFIRM.AUTO_FIX));
  }
}
