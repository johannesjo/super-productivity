import { AppDataComplete } from './sync.model';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { MIGRATABLE_MODEL_CFGS } from '../../core/persistence/persistence.const';

export const isLegacyAppData = (appData: AppDataComplete): boolean => {
  const migratableModelCfgKeys = Object.keys(MIGRATABLE_MODEL_CFGS);
  return !!migratableModelCfgKeys
    .filter((modelCfgKey) => MIGRATABLE_MODEL_CFGS[modelCfgKey].modelVersion > 0)
    .find((modelCfgKey) => {
      const appDataKey = MIGRATABLE_MODEL_CFGS[modelCfgKey].appDataKey;
      const appDataModelVersion =
        appDataKey in appData && MODEL_VERSION_KEY in appData[appDataKey]
          ? (appData[appDataKey as keyof AppDataComplete] as { [key: string]: any })[
              MODEL_VERSION_KEY
            ]
          : 0;
      const codedModelVersion = MIGRATABLE_MODEL_CFGS[modelCfgKey].modelVersion;

      // console.log({ appDataKey, appDataModelVersion, codedModelVersion });

      if (typeof appDataModelVersion !== 'number') {
        return false;
      }
      const isLegacyVersionV = isLegacyVersion(appDataModelVersion, codedModelVersion);
      if (isLegacyVersionV) {
        console.log(
          '[M] LEGACY MODEL  => ' + appDataKey,
          appDataModelVersion,
          codedModelVersion,
        );
      }
      return isLegacyVersionV;
    });
};

const isLegacyVersion = (
  appDataModelVersion: number,
  codedModelVersion: number,
): boolean => {
  return Math.floor(codedModelVersion) - Math.floor(appDataModelVersion) >= 1;
};
