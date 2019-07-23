import {MISC_SETTINGS_FORM_CFG} from './form-cfgs/misc-settings-form.const';
import {KEYBOARD_SETTINGS_FORM_CFG} from './form-cfgs/keyboard-form.const';
import {ConfigFormConfig} from './global-config.model';
import {POMODORO_FORM_CFG} from './form-cfgs/pomodoro-form.const';
import {IDLE_FORM_CFG} from './form-cfgs/idle-form.const';
import {TAKE_A_BREAK_FORM_CFG} from './form-cfgs/take-a-break-form.const';
import {GOOGLE_DRIVE_SYNC_FORM} from './form-cfgs/google-drive-sync-form.const';
import {IMEX_FORM} from './form-cfgs/imex-form.const';
import {AUTOMATIC_BACKUPS_FORM} from './form-cfgs/automatic-backups-form.const';
import {LANGUAGE_SELECTION_FORM_FORM} from './form-cfgs/language-selection-form.const';

// TODO typing
export const GLOBAL_CONFIG_FORM_CONFIG: ConfigFormConfig = [
  LANGUAGE_SELECTION_FORM_FORM,
  MISC_SETTINGS_FORM_CFG,
  IDLE_FORM_CFG,
  TAKE_A_BREAK_FORM_CFG,
  KEYBOARD_SETTINGS_FORM_CFG,
  POMODORO_FORM_CFG,
  GOOGLE_DRIVE_SYNC_FORM,
  IMEX_FORM,
  AUTOMATIC_BACKUPS_FORM,
];
