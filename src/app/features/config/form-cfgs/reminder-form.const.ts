import { ConfigFormSection, ReminderConfig } from '../global-config.model';
import { T } from '../../../t.const';

export const REMINDER_FORM_CFG: ConfigFormSection<ReminderConfig> = {
  title: T.GCF.REMINDER.TITLE,
  // help: T.GCF.REMINDER.HELP,
  key: 'reminder',
  items: [
    {
      key: 'isCountdownBannerEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.REMINDER.IS_COUNTDOWN_BANNER_ENABLED,
      },
    },
    {
      key: 'countdownDuration',
      type: 'duration',
      hideExpression: (m, v, field) => !field?.model.isCountdownBannerEnabled,
      templateOptions: {
        required: true,
        label: T.GCF.REMINDER.COUNTDOWN_DURATION,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
  ],
};
