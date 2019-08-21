import {GlobalConfigState, IdleConfig, TakeABreakConfig} from './global-config.model';
import {DEFAULT_GLOBAL_CONFIG} from './default-global-config.const';

export const migrateGlobalConfigState = (globalConfigState: GlobalConfigState): GlobalConfigState => {
  // NOTE: needs to run before default stuff
  globalConfigState = _migrateMiscToSeparateKeys(globalConfigState);

  // NOTE: absolutely needs to come last as otherwise the previous defaults won't work
  globalConfigState = _extendConfigDefaults(globalConfigState);
  return globalConfigState;
};

const _migrateMiscToSeparateKeys = (config: GlobalConfigState): GlobalConfigState => {
  const idle: IdleConfig = !!(config.idle)
    ? config.idle
    : {
      ...DEFAULT_GLOBAL_CONFIG.idle,
      isOnlyOpenIdleWhenCurrentTask: config.misc['isOnlyOpenIdleWhenCurrentTask'],
      isEnableIdleTimeTracking: config.misc['isEnableIdleTimeTracking'],
      minIdleTime: config.misc['minIdleTime'],
      isUnTrackedIdleResetsBreakTimer: config.misc['isUnTrackedIdleResetsBreakTimer'],
    };

  const takeABreak: TakeABreakConfig = !!(config.takeABreak)
    ? config.takeABreak
    : {
      ...DEFAULT_GLOBAL_CONFIG.takeABreak,
      isTakeABreakEnabled: config.misc['isTakeABreakEnabled'],
      takeABreakMessage: config.misc['takeABreakMessage'],
      takeABreakMinWorkingTime: config.misc['takeABreakMinWorkingTime'],
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
    if (config[key]) {
      delete config[key];
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


