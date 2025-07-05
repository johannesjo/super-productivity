/* eslint-disable max-len */
import { ConfigFormSection } from '../global-config.model';

export const SYNC_SAFETY_BACKUPS_FORM: ConfigFormSection<{ [key: string]: any }> = {
  title: 'Sync Safety Backups',
  // @ts-ignore
  key: 'EMPTY_SYNC_SAFETY_BACKUPS',
  help: 'Automatic backups created before destructive sync operations to prevent data loss.',
  customSection: 'SYNC_SAFETY_BACKUPS',
};
