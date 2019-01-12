import { MISC_SETTINGS_FORM_CFG } from './form-cfgs/misc-settings-form.const';
import { KEYBOARD_SETTINGS_FORM_CFG } from './form-cfgs/keyboard-form.const';
import { ConfigFormConfig } from './config.model';

// TODO typing
export const GLOBAL_CONFIG_FORM_CONFIG: ConfigFormConfig = [
  MISC_SETTINGS_FORM_CFG,
  KEYBOARD_SETTINGS_FORM_CFG,
  // POMODORO_FORM_CFG,
  {
    title: 'Sync via Google Drive',
    key: 'keyboard',
    /* tslint:disable */
    help: `Yadda yada yada`,
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
  }
];
