// tslint:disable:max-line-length
import { ConfigFormSection, LocalBackupConfig } from '../global-config.model';
import { T } from '../../../t.const';
import { getElectron } from '../../../util/get-electron';
import { IS_ELECTRON } from '../../../app.constants';
import * as ElectronRenderer from 'electron/renderer';

const backupPath = IS_ELECTRON && `${(getElectron() as typeof ElectronRenderer).remote.app.getPath('userData')}/backups`;

export const AUTOMATIC_BACKUPS_FORM: ConfigFormSection<LocalBackupConfig> = {
  isElectronOnly: true,
  title: T.GCF.AUTO_BACKUPS.TITLE,
  key: 'localBackup',
  help: T.GCF.AUTO_BACKUPS.HELP,
  items: [
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
        text: backupPath,
      },
    },
    {
      key: 'isEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.AUTO_BACKUPS.LABEL_IS_ENABLED,
      },
    },
  ]
};
