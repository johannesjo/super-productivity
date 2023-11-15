/* eslint-disable max-len */
import { ConfigFormSection, FocusModeConfig } from '../global-config.model';
import { T } from '../../../t.const';

export const FOCUS_MODE_FORM_CFG: ConfigFormSection<FocusModeConfig> = {
  // title: T.GCF.MISC.TITLE,
  title: 'Focus Mode',
  key: 'focusMode',
  help: T.GCF.MISC.HELP,
  items: [
    // {
    //   key: 'isDarkMode',
    //   type: 'checkbox',
    //   templateOptions: {
    //     label: T.GCF.MISC.IS_DARK_MODE,
    //   },
    // },
    {
      key: 'isAlwaysUseFocusMode',
      type: 'checkbox',
      templateOptions: {
        label: 'Always open focus mode, when tracking',
        // label: T.GCF.MISC.IS_NOTIFY_WHEN_TIME_ESTIMATE_EXCEEDED,
      },
    },
    {
      key: 'isSkipPreparation',
      type: 'checkbox',
      templateOptions: {
        label: 'Skip preparation screen (stretching etc.)',
        // label: T.GCF.MISC.IS_NOTIFY_WHEN_TIME_ESTIMATE_EXCEEDED,
      },
    },
  ],
};
