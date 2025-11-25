import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { PFLog } from '../../core/log';
import { LanguageCode } from '../../app.constants';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const crossModelMigration4_4: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  PFLog.log('____________________Migrate4.4__________________');
  const copy = fullData;

  // Stack of operations to be performed at the end of migration.
  const finishingOperations: (() => void)[] = [];

  // ! 1. Rename globalConfig `lang` section to `lozalization`
  const oldLangSection = copy.globalConfig['lang'];
  if (oldLangSection) {
    // @ts-ignore
    copy.globalConfig.localization = oldLangSection;
    finishingOperations.push(() => delete copy.globalConfig['lang']);
  }

  // ! 2. Move globalConfig `misc.timeLocale` to `localization.dateTimeLocale`
  const oldTimeLocale = copy.globalConfig.misc['timeLocale'];
  if (oldTimeLocale) {
    // @ts-ignore
    copy.globalConfig.localization.dateTimeLocale = oldTimeLocale;
    finishingOperations.push(() => delete copy.globalConfig.misc['timeLocale']);
  }

  // ! 3. Rename zh_tw language
  const oldZhTwLang = oldLangSection.lng === 'zh_tw';
  if (oldZhTwLang) {
    // @ts-ignore
    copy.globalConfig.localization.lng = LanguageCode.zh_tw;
  }

  finishingOperations.forEach((operation) => operation());

  PFLog.log(copy);
  return copy;
}) as CrossModelMigrateFn;
