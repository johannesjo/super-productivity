import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { PFLog } from '../../core/log';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const crossModelMigration4_4: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  PFLog.log('____________________Migrate4.4__________________');
  const copy = fullData;

  // ! Rename globalConfig `lang` section to `lozalization`
  const oldLangSection = copy.globalConfig['lang'];
  if (oldLangSection) {
    // @ts-ignore
    copy.globalConfig.localization = oldLangSection;
    delete copy.globalConfig['lang'];
  }

  // ! Move globalConfig `misc.timeLocale` to `localization.dateTimeLocale`
  const oldTimeLocale = copy.globalConfig.misc['timeLocale'];
  if (oldTimeLocale) {
    // @ts-ignore
    copy.globalConfig.localization.dateTimeLocale = oldTimeLocale;
    delete copy.globalConfig.misc['timeLocale'];
  }

  PFLog.log(copy);
  return copy;
}) as CrossModelMigrateFn;
