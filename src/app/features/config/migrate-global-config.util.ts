import { GlobalConfigState, IdleConfig, SyncConfig, TakeABreakConfig } from './global-config.model';
import { DEFAULT_GLOBAL_CONFIG } from './default-global-config.const';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isMigrateModel } from '../../util/model-version';
import { SyncProvider } from '../../imex/sync/sync-provider.model';

const MODEL_VERSION = 2.1;

export const migrateGlobalConfigState = (globalConfigState: GlobalConfigState): GlobalConfigState => {
  if (!isMigrateModel(globalConfigState, MODEL_VERSION, 'GlobalConfig')) {
    return globalConfigState;
  }

  // NOTE: needs to run before default stuff
  globalConfigState = _migrateMiscToSeparateKeys(globalConfigState);

  // NOTE: needs to run before default stuff
  globalConfigState = _migrateUndefinedShortcutsToNull(globalConfigState);

  globalConfigState = _migrateSyncCfg(globalConfigState);

  globalConfigState = _fixDefaultProjectId(globalConfigState);

  // NOTE: absolutely needs to come last as otherwise the previous defaults won't work
  globalConfigState = _extendConfigDefaults(globalConfigState);

  return {
    ...globalConfigState,
    // Update model version after all migrations ran successfully
    [MODEL_VERSION_KEY]: MODEL_VERSION,
  };
};

const _migrateMiscToSeparateKeys = (config: GlobalConfigState): GlobalConfigState => {
  const idle: IdleConfig = !!(config.idle)
    ? config.idle
    : {
      ...DEFAULT_GLOBAL_CONFIG.idle,
      // tslint:disable-next-line
      isOnlyOpenIdleWhenCurrentTask: (config.misc as any)['isOnlyOpenIdleWhenCurrentTask'],
      // tslint:disable-next-line
      isEnableIdleTimeTracking: (config.misc as any)['isEnableIdleTimeTracking'],
      // tslint:disable-next-line
      minIdleTime: (config.misc as any)['minIdleTime'],
      // tslint:disable-next-line
      isUnTrackedIdleResetsBreakTimer: (config.misc as any)['isUnTrackedIdleResetsBreakTimer'],
    };

  const takeABreak: TakeABreakConfig = !!(config.takeABreak)
    ? config.takeABreak
    : {
      ...DEFAULT_GLOBAL_CONFIG.takeABreak,
      // tslint:disable-next-line
      isTakeABreakEnabled: (config.misc as any)['isTakeABreakEnabled'],
      // tslint:disable-next-line
      takeABreakMessage: (config.misc as any)['takeABreakMessage'],
      // tslint:disable-next-line
      takeABreakMinWorkingTime: (config.misc as any)['takeABreakMinWorkingTime'],
    };

  // we delete the old keys. worst case is, that the default settings are used for outdated versions of the app
  const obsoleteMiscKeys: ((keyof TakeABreakConfig) | (keyof IdleConfig))[] = [
    'isTakeABreakEnabled',
    'takeABreakMessage',
    'takeABreakMinWorkingTime',

    'isOnlyOpenIdleWhenCurrentTask',
    'isEnableIdleTimeTracking',
    'minIdleTime',
    'isUnTrackedIdleResetsBreakTimer',
  ];

  obsoleteMiscKeys.forEach(key => {
    if ((config as any)[key]) {
      delete (config as any)[key];
    }
  });

  return {
    ...config,
    idle,
    takeABreak,
  };
};

const _extendConfigDefaults = (config: GlobalConfigState): GlobalConfigState => {
  return {
    ...DEFAULT_GLOBAL_CONFIG,
    ...config,
  };
};

const _migrateUndefinedShortcutsToNull = (config: GlobalConfigState): GlobalConfigState => {
  const keyboardCopy: any = {
    // also add new keys
    ...DEFAULT_GLOBAL_CONFIG.keyboard,
    ...config.keyboard,
  };
  Object.keys(keyboardCopy).forEach((key: string) => {
    if (keyboardCopy[key] === false || keyboardCopy[key] === undefined) {
      keyboardCopy[key] = null;
    }
  });

  return {
    ...config,
    keyboard: keyboardCopy,
  };
};

const _migrateSyncCfg = (config: GlobalConfigState): GlobalConfigState => {
  if (config.sync) {
    return config;
  }

  let prevProvider: SyncProvider | null = null;
  let syncInterval: number = 0;
  if ((config as any).dropboxSync?.isEnabled) {
    prevProvider = SyncProvider.Dropbox;
    syncInterval = (config as any).dropboxSync.syncInterval;
  }
  if ((config as any).googleDriveSync?.isEnabled) {
    prevProvider = SyncProvider.GoogleDrive;
    syncInterval = (config as any).googleDriveSync.syncInterval;
  }

  return {
    ...config,
    sync: !!prevProvider
      ? {
        isEnabled: true,
        syncInterval,
        syncProvider: prevProvider,
        dropboxSync: {
          ...DEFAULT_GLOBAL_CONFIG.sync.dropboxSync,
          accessToken: (config as any).dropboxSync?.accessToken,
          authCode: (config as any).dropboxSync?.authCode,
        },
        googleDriveSync: {
          ...DEFAULT_GLOBAL_CONFIG.sync.googleDriveSync,
          ...(config as any)?.googleDriveSync,
        },
        webDav: {
          password: null,
          syncFilePath: null,
          userName: null,
          baseUrl: null,
        }
      } as SyncConfig
      : DEFAULT_GLOBAL_CONFIG.sync,
  };
};

const _fixDefaultProjectId = (config: GlobalConfigState): GlobalConfigState => {
  if (config.misc.defaultProjectId === 'G.NONE' || config.misc.defaultProjectId === '') {
    return {
      ...config,
      misc: {
        ...config.misc,
        defaultProjectId: null,
      }
    };
  }

  return {
    ...config,
  };
};


