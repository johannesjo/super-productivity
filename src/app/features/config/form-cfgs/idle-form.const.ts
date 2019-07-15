// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {T} from '../../../t.const';

export const IDLE_FORM_CFG: ConfigFormSection = {
  title: T.F_IDLE.TITLE,
  key: 'idle',
  help: T.F_IDLE.HELP,
  items: [
    {
      key: 'isEnableIdleTimeTracking',
      type: 'checkbox',
      templateOptions: {
        label: T.F_IDLE.IS_ENABLE_IDLE_TIME_TRACKING,
      },
    },
    {
      key: 'minIdleTime',
      type: 'duration',
      hideExpression: '!model.isEnableIdleTimeTracking',
      templateOptions: {
        label: T.F_IDLE.MIN_IDLE_TIME,
      },
    },
    {
      key: 'isOnlyOpenIdleWhenCurrentTask',
      type: 'checkbox',
      hideExpression: '!model.isEnableIdleTimeTracking',
      templateOptions: {
        label: T.F_IDLE.IS_ONLY_OPEN_IDLE_WHEN_CURRENT_TASK,
      },
    },
    {
      key: 'isUnTrackedIdleResetsBreakTimer',
      type: 'checkbox',
      hideExpression: '!model.isEnableIdleTimeTracking',
      templateOptions: {
        label: T.F_IDLE.IS_UN_TRACKED_IDLE_RESETS_BREAK_TIMER,
      },
    },
  ]
};
