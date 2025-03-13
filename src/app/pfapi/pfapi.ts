import {
  PFAPICfg,
  PFAPIModelCfg,
  PFAPISyncProviderServiceInterface,
} from './pfapi.model';
import { PFAPISyncService } from './pfapi-sync.service';
import { BehaviorSubject } from 'rxjs';

// export class PFAPI<PCfg extends PFAPICfg, Ms extends PFAPIModelCfg<any>[]> {
export class PFAPI<Ms extends PFAPIModelCfg<unknown>[]> {
  private readonly _currentSyncProvider$ =
    new BehaviorSubject<PFAPISyncProviderServiceInterface | null>(null);
  private _cfg$: BehaviorSubject<PFAPICfg>;

  private readonly _pfapiSyncService: PFAPISyncService<Ms>;
  private static _wasInstanceCreated = false;

  constructor(cfg: PFAPICfg) {
    this._cfg$ = new BehaviorSubject(cfg);
    this._pfapiSyncService = new PFAPISyncService(this._cfg$, this._currentSyncProvider$);

    if (PFAPI._wasInstanceCreated) {
      throw new Error('PFAPI: This should only ever be instantiated once');
    }
    PFAPI._wasInstanceCreated = true;
  }

  init(): void {}

  setActiveProvider(activeProvider: PFAPISyncProviderServiceInterface): void {
    this._currentSyncProvider$.next(activeProvider);
  }

  on(evName: string, cb: (ev: any) => void): any {}

  model(modelId: keyof Ms): void {}

  // TODO type
  sync(): Promise<unknown> {
    return this._pfapiSyncService.sync();
  }

  pause(): void {}

  // TODO think about this
  // updateCfg(cfg: PFAPICfg): void {}
}
