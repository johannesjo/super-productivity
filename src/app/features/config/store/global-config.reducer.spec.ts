import { globalConfigReducer, initialGlobalConfigState } from './global-config.reducer';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { GlobalConfigState } from '../global-config.model';
import { LegacySyncProvider } from '../../../imex/sync/legacy-sync-provider.model';
import { AppDataCompleteNew } from '../../../pfapi/pfapi-config';

describe('GlobalConfigReducer', () => {
  describe('loadAllData action', () => {
    it('should return oldState when appDataComplete.globalConfig is falsy', () => {
      const result = globalConfigReducer(
        initialGlobalConfigState,
        loadAllData({ appDataComplete: {} as AppDataCompleteNew }),
      );

      expect(result).toBe(initialGlobalConfigState);
    });

    it('should load globalConfig from appDataComplete', () => {
      const newConfig: GlobalConfigState = {
        ...initialGlobalConfigState,
        misc: {
          ...initialGlobalConfigState.misc,
          isDisableAnimations: true,
        },
      };

      const result = globalConfigReducer(
        initialGlobalConfigState,
        loadAllData({
          appDataComplete: { globalConfig: newConfig } as AppDataCompleteNew,
        }),
      );

      expect(result.misc.isDisableAnimations).toBe(true);
    });

    it('should use syncProvider from snapshot when oldState has null (initial load)', () => {
      // This simulates app startup: oldState is initialGlobalConfigState with null syncProvider
      const oldState = initialGlobalConfigState; // syncProvider is null

      const snapshotConfig: GlobalConfigState = {
        ...initialGlobalConfigState,
        sync: {
          ...initialGlobalConfigState.sync,
          syncProvider: LegacySyncProvider.SuperSync, // Snapshot has user's provider
        },
      };

      const result = globalConfigReducer(
        oldState,
        loadAllData({
          appDataComplete: { globalConfig: snapshotConfig } as AppDataCompleteNew,
        }),
      );

      // Should use snapshot's syncProvider since oldState has null
      expect(result.sync.syncProvider).toBe(LegacySyncProvider.SuperSync);
    });

    it('should preserve syncProvider from oldState when loading synced data', () => {
      const oldState: GlobalConfigState = {
        ...initialGlobalConfigState,
        sync: {
          ...initialGlobalConfigState.sync,
          syncProvider: LegacySyncProvider.SuperSync,
        },
      };

      const syncedConfig: GlobalConfigState = {
        ...initialGlobalConfigState,
        sync: {
          ...initialGlobalConfigState.sync,
          syncProvider: null, // Remote sync data typically has null syncProvider
        },
        misc: {
          ...initialGlobalConfigState.misc,
          isDisableAnimations: true,
        },
      };

      const result = globalConfigReducer(
        oldState,
        loadAllData({
          appDataComplete: { globalConfig: syncedConfig } as AppDataCompleteNew,
        }),
      );

      // syncProvider should be preserved from oldState
      expect(result.sync.syncProvider).toBe(LegacySyncProvider.SuperSync);
      // Other config should be updated from synced data
      expect(result.misc.isDisableAnimations).toBe(true);
    });

    it('should preserve syncProvider even when synced data has a different provider', () => {
      const oldState: GlobalConfigState = {
        ...initialGlobalConfigState,
        sync: {
          ...initialGlobalConfigState.sync,
          syncProvider: LegacySyncProvider.WebDAV,
        },
      };

      const syncedConfig: GlobalConfigState = {
        ...initialGlobalConfigState,
        sync: {
          ...initialGlobalConfigState.sync,
          syncProvider: LegacySyncProvider.LocalFile,
        },
      };

      const result = globalConfigReducer(
        oldState,
        loadAllData({
          appDataComplete: { globalConfig: syncedConfig } as AppDataCompleteNew,
        }),
      );

      // syncProvider should be preserved from oldState, not overwritten
      expect(result.sync.syncProvider).toBe(LegacySyncProvider.WebDAV);
    });

    it('should update other sync config properties while preserving syncProvider', () => {
      const oldState: GlobalConfigState = {
        ...initialGlobalConfigState,
        sync: {
          ...initialGlobalConfigState.sync,
          syncProvider: LegacySyncProvider.SuperSync,
          syncInterval: 300000,
        },
      };

      const syncedConfig: GlobalConfigState = {
        ...initialGlobalConfigState,
        sync: {
          ...initialGlobalConfigState.sync,
          syncProvider: null,
          syncInterval: 600000,
          isCompressionEnabled: true,
        },
      };

      const result = globalConfigReducer(
        oldState,
        loadAllData({
          appDataComplete: { globalConfig: syncedConfig } as AppDataCompleteNew,
        }),
      );

      // syncProvider preserved
      expect(result.sync.syncProvider).toBe(LegacySyncProvider.SuperSync);
      // Other sync settings updated
      expect(result.sync.syncInterval).toBe(600000);
      expect(result.sync.isCompressionEnabled).toBe(true);
    });
  });
});
