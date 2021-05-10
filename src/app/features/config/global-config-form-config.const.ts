import { MISC_SETTINGS_FORM_CFG } from './form-cfgs/misc-settings-form.const';
import { KEYBOARD_SETTINGS_FORM_CFG } from './form-cfgs/keyboard-form.const';
import { ConfigFormConfig, GenericConfigFormSection } from './global-config.model';
import { POMODORO_FORM_CFG } from './form-cfgs/pomodoro-form.const';
import { IDLE_FORM_CFG } from './form-cfgs/idle-form.const';
import { TAKE_A_BREAK_FORM_CFG } from './form-cfgs/take-a-break-form.const';
import { IMEX_FORM } from './form-cfgs/imex-form.const';
import { AUTOMATIC_BACKUPS_FORM } from './form-cfgs/automatic-backups-form.const';
import { LANGUAGE_SELECTION_FORM_FORM } from './form-cfgs/language-selection-form.const';
import { EVALUATION_SETTINGS_FORM_CFG } from './form-cfgs/evaluation-settings-form.const';
import { SIMPLE_COUNTER_FORM } from './form-cfgs/simple-counter-form.const';
import { SOUND_FORM_CFG } from './form-cfgs/sound-form.const';
import { TRACKING_REMINDER_FORM_CFG } from './form-cfgs/tracking-reminder-form.const';
import { SYNC_FORM } from './form-cfgs/sync-form.const';
import { IS_ELECTRON } from '../../app.constants';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { TIMELINE_FORM_CFG } from './form-cfgs/timeline-form.const';

export const GLOBAL_CONFIG_FORM_CONFIG: ConfigFormConfig = [
  LANGUAGE_SELECTION_FORM_FORM as GenericConfigFormSection,
  MISC_SETTINGS_FORM_CFG as GenericConfigFormSection,
  IDLE_FORM_CFG as GenericConfigFormSection,
  KEYBOARD_SETTINGS_FORM_CFG as GenericConfigFormSection,
  TRACKING_REMINDER_FORM_CFG as GenericConfigFormSection,
  TIMELINE_FORM_CFG as GenericConfigFormSection,
  SOUND_FORM_CFG as GenericConfigFormSection,
].filter((cfg) => IS_ELECTRON || !cfg.isElectronOnly);

export const GLOBAL_SYNC_FORM_CONFIG: ConfigFormConfig = [
  SYNC_FORM as GenericConfigFormSection,
  ...(IS_ANDROID_WEB_VIEW ? [] : [IMEX_FORM as GenericConfigFormSection]),
  AUTOMATIC_BACKUPS_FORM as GenericConfigFormSection,
].filter((cfg) => IS_ELECTRON || !cfg.isElectronOnly);

export const GLOBAL_PRODUCTIVITY_FORM_CONFIG: ConfigFormConfig = [
  TAKE_A_BREAK_FORM_CFG as GenericConfigFormSection,
  POMODORO_FORM_CFG as GenericConfigFormSection,
  EVALUATION_SETTINGS_FORM_CFG as GenericConfigFormSection,
  SIMPLE_COUNTER_FORM as GenericConfigFormSection,
].filter((cfg) => IS_ELECTRON || !cfg.isElectronOnly);
