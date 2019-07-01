// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';

export const TAKE_A_BREAK_FORM_CFG: ConfigFormSection = {
  title: 'Break Reminder',
  key: 'takeABreak',
  help: `
  <div>
    <p>Allows you to configure a reoccurring reminder when you have worked for a specified amount of time without taking
      a break.</p>
    <p>You can modify the message displayed. \${duration} will be replaced with the time spent without a break.</p>
  </div>`,
  items: [
    {
      key: 'isTakeABreakEnabled',
      type: 'checkbox',
      templateOptions: {
        label: 'Enable take a break reminder',
      },
    },
    {
      key: 'takeABreakMinWorkingTime',
      type: 'duration',
      hideExpression: '!model.isTakeABreakEnabled',
      templateOptions: {
        label: 'Trigger take a break notification after X working without one',
      },
    }, {
      key: 'takeABreakMessage',
      type: 'textarea',
      hideExpression: '!model.isTakeABreakEnabled',
      templateOptions: {
        label: 'Take a break message',
      },
    },

  ]
};
