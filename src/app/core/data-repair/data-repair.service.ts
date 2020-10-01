import { Injectable } from '@angular/core';
import { AppDataComplete } from '../../imex/sync/sync.model';
import { T } from '../../t.const';
import { TranslateService } from '@ngx-translate/core';
import { dataRepair } from './data-repair.util';

@Injectable({
  providedIn: 'root'
})
export class DataRepairService {

  constructor(
    private _translateService: TranslateService,
  ) {
  }

  repairData(dataIn: AppDataComplete): AppDataComplete {
    return dataRepair(dataIn);
  }

  isRepairPossibleAndConfirmed(dataIn: AppDataComplete): boolean {
    const isDataRepairPossible: boolean =
      typeof dataIn === 'object' && dataIn !== null
      && typeof dataIn.task === 'object' && dataIn.task !== null
      && typeof dataIn.project === 'object' && dataIn.project !== null

    if (!isDataRepairPossible) {
      alert('Data damaged, repair not possible.')
      return false;
    }
    return confirm(this._translateService.instant(T.CONFIRM.AUTO_FIX));
  }
}
