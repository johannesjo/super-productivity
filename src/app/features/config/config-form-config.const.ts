import { MISC_SETTINGS_FORM_CFG } from './form-cfgs/misc-settings-form.const';
import { KEYBOARD_SETTINGS_FORM_CFG } from './form-cfgs/keyboard-form.const';
import { ConfigFormConfig } from './config.model';
import { POMODORO_FORM_CFG } from './form-cfgs/pomodoro-form.const';

// TODO typing
export const GLOBAL_CONFIG_FORM_CONFIG: ConfigFormConfig = [
  MISC_SETTINGS_FORM_CFG,
  KEYBOARD_SETTINGS_FORM_CFG,
  // POMODORO_FORM_CFG,
  {
    title: 'Sync Settings',
    key: 'keyboard',
    /* tslint:disable */
    help: `Yadda yada yada`,
    /* tslint:enable */
    customSection: 'GOOGLE_SYNC',
  }
];
