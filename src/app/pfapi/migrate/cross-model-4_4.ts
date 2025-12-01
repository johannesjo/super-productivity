import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { PFLog } from '../../core/log';
import { LanguageCode } from '../../core/locale.constants';
import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const crossModelMigration4_4: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  PFLog.log('____________________Migrate4.4__________________');
  const copy = fullData;

  // Stack of operations to be performed at the end of migration.
  const finishingOperations: (() => void)[] = [];

  // ! 1. Rename globalConfig `lang` section to `localization`
  const oldLangSection = copy.globalConfig?.['lang'];
  const hasLangSection = !!oldLangSection && typeof oldLangSection === 'object';

  if (hasLangSection) {
    // @ts-ignore
    copy.globalConfig.localization = {
      ...copy.globalConfig.localization,
      ...oldLangSection,
    };
    finishingOperations.push(() => delete copy.globalConfig['lang']);
  }

  // ! 2. Move globalConfig `misc.timeLocale` to `localization.dateTimeLocale`
  const oldTimeLocale = copy.globalConfig?.misc?.['timeLocale'];
  if (oldTimeLocale) {
    // @ts-ignore
    copy.globalConfig.localization = {
      ...copy.globalConfig.localization,
      dateTimeLocale: oldTimeLocale,
    };
    finishingOperations.push(() => {
      if (copy.globalConfig?.misc) {
        delete copy.globalConfig.misc['timeLocale'];
      }
    });
  }

  // ! 3. Rename zh_tw language
  if (hasLangSection && oldLangSection?.lng === 'zh_tw') {
    // @ts-ignore
    copy.globalConfig.localization = {
      ...copy.globalConfig.localization,
      lng: LanguageCode.zh_tw,
    };
  }

  // ! 4. Initialize App Features
  if (copy.globalConfig && !copy.globalConfig.appFeatures) {
    // @ts-ignore
    copy.globalConfig.appFeatures = DEFAULT_GLOBAL_CONFIG.appFeatures;
  } else if (copy.globalConfig && copy.globalConfig.appFeatures) {
    // @ts-ignore
    copy.globalConfig.appFeatures = {
      ...DEFAULT_GLOBAL_CONFIG.appFeatures,
      ...copy.globalConfig.appFeatures,
    };
  }

  // ! 5. Migrate User Profiles
  if (
    copy.globalConfig &&
    copy.globalConfig.misc &&
    // @ts-ignore
    typeof copy.globalConfig.misc.isEnableUserProfiles === 'boolean'
  ) {
    if (copy.globalConfig.appFeatures) {
      // @ts-ignore
      copy.globalConfig.appFeatures = {
        ...copy.globalConfig.appFeatures,
        // @ts-ignore
        isEnableUserProfiles: copy.globalConfig.misc.isEnableUserProfiles,
      };
    }
    // @ts-ignore
    delete copy.globalConfig.misc.isEnableUserProfiles;
  }

  finishingOperations.forEach((operation) => operation());

  PFLog.log(copy);
  return copy;
}) as CrossModelMigrateFn;
