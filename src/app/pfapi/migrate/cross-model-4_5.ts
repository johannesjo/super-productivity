import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { PFLog } from '../../core/log';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const crossModelMigration4_5: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  PFLog.log('____________________Migrate4.5__________________');
  const copy = fullData;

  // ! 1. Convert globalConfig `lng` to lowercase
  const oldLang = copy.globalConfig?.localization?.lng;
  if (oldLang) {
    // @ts-ignore
    copy.globalConfig.localization = {
      ...copy.globalConfig.localization,
      lng: oldLang.toLocaleLowerCase(),
    };
  }

  // ! 2. Convert globalConfig `dateTimeLocale` to lowercase
  const oldDateTimeLocale = copy.globalConfig?.localization?.dateTimeLocale;
  if (oldDateTimeLocale) {
    // @ts-ignore
    copy.globalConfig.localization = {
      ...copy.globalConfig.localization,
      dateTimeLocale: oldDateTimeLocale.toLocaleLowerCase(),
    };
  }

  PFLog.log(copy);
  return copy;
}) as CrossModelMigrateFn;
