import { inject, InjectionToken, Injector } from '@angular/core';
import { PfapiService } from '../../pfapi/pfapi.service';

/**
 * Interface for providing the sync client ID.
 *
 * This abstraction breaks the circular dependency between operation-log services
 * and PfapiService. Previously, services like OperationLogSyncService,
 * ConflictResolutionService, and ServerMigrationService used lazyInject()
 * to get PfapiService just for the client ID.
 *
 * By injecting this token instead, the dependency graph is cleaner:
 * - Operation-log services depend on CLIENT_ID_PROVIDER (a simple interface)
 * - CLIENT_ID_PROVIDER is implemented by a factory that uses PfapiService
 * - No circular dependency because PfapiService is resolved lazily at call time
 */
export interface ClientIdProvider {
  loadClientId(): Promise<string | null>;
}

/**
 * Injection token for the client ID provider.
 *
 * Uses lazy injection via Injector.get() to break the circular dependency.
 * PfapiService is only resolved when loadClientId() is called, not at
 * provider creation time.
 *
 * Usage:
 * ```typescript
 * private clientIdProvider = inject(CLIENT_ID_PROVIDER);
 * // ...
 * const clientId = await this.clientIdProvider.loadClientId();
 * ```
 */
export const CLIENT_ID_PROVIDER = new InjectionToken<ClientIdProvider>(
  'CLIENT_ID_PROVIDER',
  {
    providedIn: 'root',
    factory: () => {
      const injector = inject(Injector);
      let pfapiService: PfapiService | null = null;

      return {
        loadClientId: () => {
          // Lazy injection: only resolve PfapiService when actually needed
          if (!pfapiService) {
            pfapiService = injector.get(PfapiService);
          }
          return pfapiService.pf.metaModel.loadClientId();
        },
      };
    },
  },
);
