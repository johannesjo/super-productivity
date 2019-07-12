// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';

export const AUTOMATIC_BACKUPS_FORM: ConfigFormSection = {
  isElectronOnly: true,
  title: 'Automatic Backups',
  key: 'localBackup',
  help: `Auto save all data to your app folder in order to have it ready in case something goes wrong.`,
  items: [
    {
      key: 'isEnabled',
      type: 'toggle',
      templateOptions: {
        label: 'Enable automatic backups',
      },
    },
  ]
};
