import { Injectable, inject, Injector } from '@angular/core';
import { PfapiService } from '../../pfapi/pfapi.service';

/**
 * Service for managing the sync client ID.
 *
 * Abstracts client ID access from operation-log services, breaking the
 * direct dependency on PfapiService. This enables cleaner separation
 * between PFAPI and Operation Log systems.
 *
 * Currently delegates to MetaModelCtrl, but the abstraction allows
 * future refactoring to use independent storage if needed.
 *
 * Uses lazy injection via Injector.get() to break circular dependencies.
 * PfapiService is only resolved when loadClientId() is called, not at
 * service creation time.
 */
@Injectable({
  providedIn: 'root',
})
export class ClientIdService {
  private _injector = inject(Injector);
  private _pfapiService: PfapiService | null = null;
  private _cachedClientId: string | null = null;

  /**
   * Loads the client ID.
   *
   * Uses caching to avoid repeated IndexedDB reads. The client ID is
   * immutable once generated, so caching is safe.
   *
   * @returns The client ID, or null if not yet generated
   */
  async loadClientId(): Promise<string | null> {
    if (this._cachedClientId) {
      return this._cachedClientId;
    }

    const pfapiService = this._getPfapiService();
    this._cachedClientId = await pfapiService.pf.metaModel.loadClientId();
    return this._cachedClientId;
  }

  /**
   * Clears the cached client ID.
   *
   * Used for testing or when the client ID storage needs to be re-read.
   */
  clearCache(): void {
    this._cachedClientId = null;
  }

  private _getPfapiService(): PfapiService {
    if (!this._pfapiService) {
      this._pfapiService = this._injector.get(PfapiService);
    }
    return this._pfapiService;
  }
}
