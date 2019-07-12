// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';

export const GOOGLE_DRIVE_SYNC_FORM: ConfigFormSection = {
  title: 'Sync via Google Drive',
  key: 'keyboard',
  /* tslint:disable */
  help: `Here you can configure your app to automatically sync to and from a single google drive file. All data will be saved unencrypted, so make sure you don't accidentally share this file with someone.`,
  /* tslint:enable */
  customSection: 'GOOGLE_SYNC',
};
