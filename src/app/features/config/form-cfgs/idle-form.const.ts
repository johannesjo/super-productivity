// tslint:disable:max-line-length
import {ConfigFormSection, IdleConfig} from '../global-config.model';
import {T} from '../../../t.const';

export const IDLE_FORM_CFG: ConfigFormSection<IdleConfig> = {
  title: T.GCF.IDLE.TITLE,
  key: 'idle',
  help: T.GCF.IDLE.HELP,
  items: [
    {
      key: 'isEnableIdleTimeTracking',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.IDLE.IS_ENABLE_IDLE_TIME_TRACKING,
      },
    },
    {
      key: 'minIdleTime',
      type: 'duration',
      hideExpression: '!model.isEnableIdleTimeTracking',
      templateOptions: {
        label: T.GCF.IDLE.MIN_IDLE_TIME,
      },
    },
    {
      key: 'isOnlyOpenIdleWhenCurrentTask',
      type: 'checkbox',
      hideExpression: '!model.isEnableIdleTimeTracking',
      templateOptions: {
        label: T.GCF.IDLE.IS_ONLY_OPEN_IDLE_WHEN_CURRENT_TASK,
      },
    },
    {
      key: 'isUnTrackedIdleResetsBreakTimer',
      type: 'checkbox',
      hideExpression: '!model.isEnableIdleTimeTracking',
      templateOptions: {
        label: T.GCF.IDLE.IS_UN_TRACKED_IDLE_RESETS_BREAK_TIMER,
      },
    },
  ]
};
