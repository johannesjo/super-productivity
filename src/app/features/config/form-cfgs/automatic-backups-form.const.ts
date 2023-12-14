/* eslint-disable max-len */
import { ConfigFormSection, LocalBackupConfig } from '../global-config.model';
import { T } from '../../../t.const';
import { IS_ELECTRON } from '../../../app.constants';

const backupPath =
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  IS_ELECTRON &&
  `${window.electronAPI.getUserDataPath()}${
    navigator?.userAgent?.search('Windows') ? '\\' : '/'
  }backups`;

export const AUTOMATIC_BACKUPS_FORM: ConfigFormSection<LocalBackupConfig> = {
  title: T.GCF.AUTO_BACKUPS.TITLE,
  key: 'localBackup',
  help: T.GCF.AUTO_BACKUPS.HELP,
  items: [
    ...(IS_ELECTRON
      ? [
          {
            type: 'tpl',
            className: `tpl`,
            templateOptions: {
              tag: 'p',
              text: T.GCF.AUTO_BACKUPS.LOCATION_INFO,
            },
          },
          {
            type: 'tpl',
            className: `tpl`,
            templateOptions: {
              tag: 'p',
              text: `<a href="file://${backupPath}" target="_blank">${backupPath}</a>`,
            },
          },
        ]
      : []),
    {
      key: 'isEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.AUTO_BACKUPS.LABEL_IS_ENABLED,
      },
    },
  ],
};
