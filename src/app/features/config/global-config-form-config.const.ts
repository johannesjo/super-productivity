import {MISC_SETTINGS_FORM_CFG} from './form-cfgs/misc-settings-form.const';
import {KEYBOARD_SETTINGS_FORM_CFG} from './form-cfgs/keyboard-form.const';
import {ConfigFormConfig} from './global-config.model';
import {POMODORO_FORM_CFG} from './form-cfgs/pomodoro-form.const';
import {IDLE_FORM_CFG} from './form-cfgs/idle-form.const';
import {TAKE_A_BREAK_FORM_CFG} from './form-cfgs/take-a-break-form.const';

// TODO typing
export const GLOBAL_CONFIG_FORM_CONFIG: ConfigFormConfig = [
  MISC_SETTINGS_FORM_CFG,
  IDLE_FORM_CFG,
  TAKE_A_BREAK_FORM_CFG,
  KEYBOARD_SETTINGS_FORM_CFG,
  POMODORO_FORM_CFG,
  {
    title: 'Sync via Google Drive',
    key: 'keyboard',
    /* tslint:disable */
    help: `Here you can configure your app to automatically sync to and from a single google drive file. All data will be saved unencrypted, so make sure you don't accidentally share this file with someone.`,
    /* tslint:enable */
    customSection: 'GOOGLE_SYNC',
  },
  {
    title: 'Import/Export',
    key: 'EMPTY',
    /* tslint:disable */
    help: `  <p>Here you can export all your data as a
    <strong>JSON</strong> for backups, but also to use it in a different context (e.g. you might want to export your projects in the browser and import them into the desktop version).
  </p>
  <p>The import expects valid JSON to be copied into the text area.
    <strong>NOTE: Once you hit the import button all your current settings and data will be overwritten!</strong></p>
`,
    /* tslint:enable */
    customSection: 'FILE_IMPORT_EXPORT',
  },
  {
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
  }
];
