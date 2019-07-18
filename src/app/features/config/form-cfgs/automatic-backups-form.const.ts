// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {T} from '../../../t.const';

export const AUTOMATIC_BACKUPS_FORM: ConfigFormSection = {
  isElectronOnly: true,
  title: T.GCF.AUTO_BACKUPS.TITLE,
  key: 'localBackup',
  help: T.GCF.AUTO_BACKUPS.HELP,
  items: [
    {
      key: 'isEnabled',
      type: 'toggle',
      templateOptions: {
        label: T.GCF.AUTO_BACKUPS.LABEL_IS_ENABLED,
      },
    },
  ]
};
