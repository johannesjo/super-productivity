import { AppBaseData, AppDataComplete } from './sync.model';
import { crossModelMigrations } from '../../core/persistence/cross-model-migrations';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import {
  BASE_MODEL_CFGS,
  ENTITY_MODEL_CFGS,
} from '../../core/persistence/persistence.const';

export const migrateLegacyAppData = (appData: AppDataComplete): AppDataComplete => {
  const newAppData = dirtyDeepCopy(appData);

  for (const [, baseModelCfg] of Object.entries(BASE_MODEL_CFGS)) {
    if (baseModelCfg.migrateFn) {
      newAppData[baseModelCfg.appDataKey as keyof AppBaseData] = baseModelCfg.migrateFn(
        newAppData[baseModelCfg.appDataKey as keyof AppBaseData],
      );
    }
  }

  for (const [, entityModelCfg] of Object.entries(ENTITY_MODEL_CFGS)) {
    if (entityModelCfg.migrateFn) {
      newAppData[entityModelCfg.appDataKey as keyof AppBaseData] =
        entityModelCfg.migrateFn(
          newAppData[entityModelCfg.appDataKey as keyof AppBaseData],
        );
    }
  }

  // NOTE ProjectModel migrations are currently not necessary as they don't exist

  return crossModelMigrations(newAppData);
};
