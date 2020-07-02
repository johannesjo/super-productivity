// tslint:disable:max-line-length
import { T } from '../../../t.const';
import { ConfigFormSection, GoogleDriveSyncConfig } from '../global-config.model';

export const GOOGLE_DRIVE_SYNC_FORM: ConfigFormSection<GoogleDriveSyncConfig> = {
  title: T.GCF.GOOGLE_DRIVE_SYNC.TITLE,
  key: 'googleDriveSync',
  help: T.GCF.GOOGLE_DRIVE_SYNC.HELP,
  customSection: 'GOOGLE_SYNC',
};
