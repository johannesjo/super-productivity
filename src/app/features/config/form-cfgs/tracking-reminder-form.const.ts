// tslint:disable:max-line-length
import { ConfigFormSection, TrackingReminderConfig } from '../global-config.model';
import { T } from '../../../t.const';

export const TRACKING_REMINDER_FORM_CFG: ConfigFormSection<TrackingReminderConfig> = {
  title: T.GCF.TRACKING_REMINDER.TITLE,
  help: T.GCF.TRACKING_REMINDER.HELP,
  key: 'trackingReminder',
  items: [
    {
      key: 'isEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.TRACKING_REMINDER.L_IS_ENABLED,
      },
    },
    {
      key: 'minTime',
      type: 'duration',
      templateOptions: {
        label: T.GCF.TRACKING_REMINDER.L_MIN_TIME
      },
    },
  ]
};
