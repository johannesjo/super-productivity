import {
  GlobalConfigState,
  IdleConfig,
  TakeABreakConfig,
  TimeTrackingConfig,
  TrackingReminderConfigOld,
} from './global-config.model';
import { DEFAULT_GLOBAL_CONFIG } from './default-global-config.const';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isMigrateModel } from '../../util/is-migrate-model';
import { LegacySyncProvider } from '../../imex/sync/legacy-sync-provider.model';
import { MODEL_VERSION } from '../../core/model-version';

export const migrateGlobalConfigState = (
  globalConfigState: GlobalConfigState,
): GlobalConfigState => {
  if (!isMigrateModel(globalConfigState, MODEL_VERSION.GLOBAL_CONFIG, 'GlobalConfig')) {
    return globalConfigState;
  }

  // NOTE: needs to run before default stuff
  globalConfigState = _migrateMiscToSeparateKeys(globalConfigState);

  // NOTE: needs to run before default stuff
  globalConfigState = _migrateUndefinedShortcutsToNull(globalConfigState);

  globalConfigState = _migrateSyncCfg(globalConfigState);

  globalConfigState = _migrateToNewTimeTrackingConfig(globalConfigState);

  globalConfigState = _migrateMotivationalImg(globalConfigState);

  globalConfigState = _migrateTimelineToSchedule(globalConfigState);

  globalConfigState = _fixDefaultProjectId(globalConfigState);

  // NOTE: absolutely needs to come last as otherwise the previous defaults won't work
  // NOTE2: mutates
  globalConfigState = _extendConfigDefaults(globalConfigState);

  return {
    ...globalConfigState,
    // Update model version after all migrations ran successfully
    [MODEL_VERSION_KEY]: MODEL_VERSION.GLOBAL_CONFIG,
  };
};

const _migrateMiscToSeparateKeys = (config: GlobalConfigState): GlobalConfigState => {
  const idle: IdleConfig = !!config.idle
    ? config.idle
    : {
        ...DEFAULT_GLOBAL_CONFIG.idle,
        // eslint-disable-next-line
        isOnlyOpenIdleWhenCurrentTask: (config.misc as any).isOnlyOpenIdleWhenCurrentTask,
        // eslint-disable-next-line
        isEnableIdleTimeTracking: (config.misc as any)['isEnableIdleTimeTracking'],
        // eslint-disable-next-line
        minIdleTime: (config.misc as any)['minIdleTime'],
      };

  const takeABreak: TakeABreakConfig = !!config.takeABreak
    ? config.takeABreak
    : {
        ...DEFAULT_GLOBAL_CONFIG.takeABreak,
        // eslint-disable-next-line
        isTakeABreakEnabled: (config.misc as any)['isTakeABreakEnabled'],
        // eslint-disable-next-line
        takeABreakMessage: (config.misc as any)['takeABreakMessage'],
        // eslint-disable-next-line
        takeABreakMinWorkingTime: (config.misc as any)['takeABreakMinWorkingTime'],
      };

  // we delete the old keys. worst case is, that the default settings are used for outdated versions of the app
  const obsoleteMiscKeys: (keyof TakeABreakConfig | keyof IdleConfig)[] = [
    'isTakeABreakEnabled',
    'takeABreakMessage',
    'takeABreakMinWorkingTime',
    'isOnlyOpenIdleWhenCurrentTask',
    'isEnableIdleTimeTracking',
    'minIdleTime',
  ];

  obsoleteMiscKeys.forEach((key) => {
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
  const newCfg: Partial<GlobalConfigState> = { ...config };
  for (const key in DEFAULT_GLOBAL_CONFIG) {
    if (!newCfg.hasOwnProperty(key)) {
      // @ts-ignore
      newCfg[key] = { ...DEFAULT_GLOBAL_CONFIG[key] };
    } else if (
      // @ts-ignore
      typeof DEFAULT_GLOBAL_CONFIG[key] === 'object' &&
      // @ts-ignore
      DEFAULT_GLOBAL_CONFIG[key] !== null
    ) {
      // @ts-ignore
      for (const entryKey in DEFAULT_GLOBAL_CONFIG[key]) {
        // @ts-ignore
        if (!newCfg[key].hasOwnProperty(entryKey)) {
          // @ts-ignore
          const defaultVal = DEFAULT_GLOBAL_CONFIG[key][entryKey];
          console.log('EXTEND globalConfig', key, entryKey, defaultVal);
          // @ts-ignore
          newCfg[key] = { ...newCfg[key], [entryKey]: defaultVal };
        }
      }
    }
  }
  return newCfg as GlobalConfigState;
};

const _migrateUndefinedShortcutsToNull = (
  config: GlobalConfigState,
): GlobalConfigState => {
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

const _migrateTimelineToSchedule = (config: GlobalConfigState): GlobalConfigState => {
  return {
    ...config,
    schedule:
      config.schedule || (config as any).timeline || DEFAULT_GLOBAL_CONFIG.schedule,
  };
};

const _migrateToNewTimeTrackingConfig = (
  config: GlobalConfigState,
): GlobalConfigState => {
  if (config.timeTracking) {
    return config;
  }
  const trackingOld = (config as any).trackingReminder as TrackingReminderConfigOld;
  const miscOld = config.misc as any as Partial<TimeTrackingConfig>;

  return {
    ...config,
    timeTracking: {
      ...DEFAULT_GLOBAL_CONFIG.timeTracking,
      trackingReminderMinTime: trackingOld.minTime,
      isTrackingReminderEnabled: trackingOld.isEnabled,
      isTrackingReminderShowOnMobile: trackingOld.isShowOnMobile,
      isAutoStartNextTask:
        miscOld.isAutoStartNextTask ||
        DEFAULT_GLOBAL_CONFIG.timeTracking.isAutoStartNextTask,
      isNotifyWhenTimeEstimateExceeded:
        miscOld.isNotifyWhenTimeEstimateExceeded ||
        DEFAULT_GLOBAL_CONFIG.timeTracking.isNotifyWhenTimeEstimateExceeded,
    },
  };
};

const _migrateMotivationalImg = (config: GlobalConfigState): GlobalConfigState => {
  const takeABreakCopy: TakeABreakConfig = {
    // also add new keys
    ...DEFAULT_GLOBAL_CONFIG.takeABreak,
    ...config.takeABreak,
  };

  if (!takeABreakCopy.motivationalImgs) {
    (takeABreakCopy as any).motivationalImgs = [];
  }
  if ((takeABreakCopy as any).motivationalImg) {
    if (!takeABreakCopy.motivationalImgs.length) {
      (takeABreakCopy as any).motivationalImgs = [
        (takeABreakCopy as any).motivationalImg,
      ];
    }
    delete (takeABreakCopy as any).motivationalImg;
  }

  return {
    ...config,
    takeABreak: takeABreakCopy,
  };
};

const _migrateSyncCfg = (config: GlobalConfigState): GlobalConfigState => {
  // const getDir = (file: string): string | null => {
  //   const normalizedFilePath = file.replace(/\\/g, '/');
  //   const m = normalizedFilePath.match(/(.*)\//);
  //   return (m && m[1]) || null;
  // };

  if (config.sync) {
    let syncProvider: LegacySyncProvider | null = config.sync.syncProvider;
    if ((syncProvider as any) === 'GoogleDrive') {
      syncProvider = null;
    }
    if ((config.sync as any).googleDriveSync) {
      delete (config.sync as any).googleDriveSync;
    }

    if (!config.sync.localFileSync || !config.sync.webDav) {
      console.warn(
        'sync config was missing some keys, reverting to default',
        config.sync,
      );
      return {
        ...config,
        sync: {
          ...DEFAULT_GLOBAL_CONFIG.sync,
        },
      };
    }

    // if (
    //   !config.sync.localFileSync.syncFolderPath &&
    //   config.sync.localFileSync.syncFilePath?.length
    // ) {
    //   config.sync.localFileSync.syncFolderPath = getDir(
    //     config.sync.localFileSync.syncFilePath,
    //   );
    //   console.log(
    //     'migrating new folder path localFileSync',
    //     JSON.stringify(config.sync.localFileSync),
    //   );
    //   // TODO add delete with next version
    //   // delete config.sync.localFileSync.syncFilePath;
    // }
    // if (!config.sync.webDav.syncFolderPath && config.sync.webDav.syncFilePath?.length) {
    //   config.sync.webDav.syncFolderPath = getDir(config.sync.webDav.syncFilePath);
    //   console.log('migrating new folder path webDav', JSON.stringify(config.sync.webDav));
    //   // TODO add delete with next version
    //   // delete config.sync.webDav.syncFilePath;
    // }

    return { ...config, sync: { ...config.sync, syncProvider } };
  }
  return config;
};

const _fixDefaultProjectId = (config: GlobalConfigState): GlobalConfigState => {
  if (
    config.misc.defaultProjectId === 'DEFAULT' ||
    config.misc.defaultProjectId === 'G.NONE' ||
    config.misc.defaultProjectId === ''
  ) {
    return {
      ...config,
      misc: {
        ...config.misc,
        defaultProjectId: null,
      },
    };
  }

  return {
    ...config,
  };
};
