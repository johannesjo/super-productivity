// tslint:disable:max-line-length
import {T} from '../../../t.const';
import {ConfigFormSection, GoogleDriveSyncConfig} from '../global-config.model';

export const DROPBOX_SYNC_FORM: ConfigFormSection<GoogleDriveSyncConfig> = {
  // title: T.GCF.GOOGLE_DRIVE_SYNC.TITLE,
  title: 'DROPBOX',
  key: 'keyboard',
  help: T.GCF.GOOGLE_DRIVE_SYNC.HELP,
  customSection: 'DROPBOX_SYNC',
};
