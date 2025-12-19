import { ConfigFormSection, FocusModeConfig } from '../global-config.model';
import { T } from '../../../t.const';

export const FOCUS_MODE_FORM_CFG: ConfigFormSection<FocusModeConfig> = {
  title: T.GCF.FOCUS_MODE.TITLE,
  key: 'focusMode',
  help: T.GCF.FOCUS_MODE.HELP,
  items: [
    {
      key: 'isAlwaysUseFocusMode',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.FOCUS_MODE.L_ALWAYS_OPEN_FOCUS_MODE,
      },
    },
    {
      key: 'isSkipPreparation',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.FOCUS_MODE.L_SKIP_PREPARATION_SCREEN,
      },
    },
    {
      key: 'isPlayTick',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.FOCUS_MODE.L_IS_PLAY_TICK,
      },
    },
    {
      key: 'isPauseTrackingDuringBreak',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.FOCUS_MODE.L_PAUSE_TRACKING_DURING_BREAK,
      },
    },
    {
      key: 'isAutoStartSession',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.FOCUS_MODE.L_AUTO_START_SESSION,
      },
    },
    {
      key: 'isStartInBackground',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.FOCUS_MODE.L_START_IN_BACKGROUND,
      },
    },
  ],
};
