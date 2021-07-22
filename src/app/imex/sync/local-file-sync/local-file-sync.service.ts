import { Injectable } from '@angular/core';
import { SyncProvider, SyncProviderServiceInterface } from '../sync-provider.model';
import { Observable, of } from 'rxjs';
import { IS_ELECTRON } from '../../../app.constants';
import { AppDataComplete, SyncGetRevResult } from '../sync.model';

@Injectable({
  providedIn: 'root',
})
export class LocalFileSyncService implements SyncProviderServiceInterface {
  id: SyncProvider = SyncProvider.LocalFile;
  isUploadForcePossible?: boolean;
  isReady$: Observable<boolean> = of(IS_ELECTRON);

  constructor() {}

  async getRevAndLastClientUpdate(
    localRev: string | null,
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult> {
    return {
      rev: 'asd',
    };
  }

  async uploadAppData(
    data: AppDataComplete,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error> {
    return 'asd';
  }

  async downloadAppData(
    localRev: string | null,
  ): Promise<{ rev: string; data: AppDataComplete | undefined }> {
    return {
      rev: 'asd',
      data: undefined,
    };
  }
}
