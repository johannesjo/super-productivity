import { AppDataComplete } from './sync.model';
import { ALL_MODEL_CFGS } from '../../core/persistence/persistence.const';
import { MODEL_VERSION_KEY } from '../../app.constants';

export const isLegacyAppData = (appData: AppDataComplete): boolean => {
  // const importVersion = modelData && modelData[MODEL_VERSION_KEY];
  const allModelCfgKeys = Object.keys(ALL_MODEL_CFGS);
  return !!allModelCfgKeys
    .filter((modelCfgKey) => ALL_MODEL_CFGS[modelCfgKey].modelVersion > 0)
    .find((modelCfgKey) => {
      const appDataKey = ALL_MODEL_CFGS[modelCfgKey].appDataKey;
      const appDataModelVersion =
        appDataKey in appData && MODEL_VERSION_KEY in appData[appDataKey]
          ? (appData[appDataKey] as any)[MODEL_VERSION_KEY]
          : 0;
      const codedModelVersion = ALL_MODEL_CFGS[modelCfgKey].modelVersion;

      // console.log({ appDataKey, appDataModelVersion, codedModelVersion });

      if (typeof appDataModelVersion !== 'number') {
        return false;
      }
      return isLegacyVersion(appDataModelVersion, codedModelVersion);
    });
};

const isLegacyVersion = (
  appDataModelVersion: number,
  codedModelVersion: number,
): boolean => {
  return Math.floor(codedModelVersion) - Math.floor(appDataModelVersion) >= 1;
};
