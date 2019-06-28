// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';

export const IDLE_FORM_CFG: ConfigFormSection = {
  title: 'Idle Handling',
  key: 'idle',
  help: `
  <div>
    <p>When idle time handling is enabled a dialog will open after a specified amount of time to check if and on which task you want to track your time, when
      you have been idle.</p>
  </div>`,
  items: [
    {
      key: 'isEnableIdleTimeTracking',
      type: 'checkbox',
      templateOptions: {
        label: 'Enable idle time handling',
      },
    },
    {
      key: 'minIdleTime',
      type: 'duration',
      hideExpression: '!model.isEnableIdleTimeTracking',
      templateOptions: {
        label: 'Trigger idle after X',
      },
    },
    {
      key: 'isOnlyOpenIdleWhenCurrentTask',
      type: 'checkbox',
      hideExpression: '!model.isEnableIdleTimeTracking',
      templateOptions: {
        label: 'Only trigger idle time dialog when a current task is selected',
      },
    },
    {
      key: 'isUnTrackedIdleResetsBreakTimer',
      type: 'checkbox',
      hideExpression: '!model.isEnableIdleTimeTracking',
      templateOptions: {
        label: 'Untracked idle time resets take a break timer',
      },
    },
  ]
};
