import { Injectable } from '@angular/core';
import { AppDataComplete } from '../../imex/sync/sync.model';
import { T } from '../../t.const';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class DataRepairService {

  constructor(
    private _translateService: TranslateService,
  ) {
  }

  async repairData(dataIn: AppDataComplete): Promise<AppDataComplete> {
    return dataIn;
  }

  isRepairConfirmed(): boolean {
    return confirm(this._translateService.instant(T.CONFIRM.AUTO_FIX));
  }
}
