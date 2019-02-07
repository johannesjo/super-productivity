// tslint:disable:max-line-length
import { ConfigFormSection } from '../config.model';

export const MISC_SETTINGS_FORM_CFG: ConfigFormSection = {
  title: 'Misc Settings',
  key: 'misc',
  help: `
  <div>
    <div class="mat-caption">Enable idle time handling</div>
    <p>Open a dialog after a specified amount of time to check if and on which task you want to track your time, when
      you have been idle.</p>

    <div class="mat-caption">Enable take a break reminder</div>
    <p>Allows you to configure a reoccurring reminder when you have worked for a specified amount of time without taking
      a break.</p>
    <p>You can modify the message displayed. \${duration} will be replaced with the time spent without a break.</p>
  </div>`,
  items: [
    {
      key: 'isConfirmBeforeExit',
      type: 'checkbox',
      templateOptions: {
        label: 'Confirm before exiting the app',
      },
    },
    {
      key: 'isMinimizeToTrayOnExit',
      type: 'checkbox',
      templateOptions: {
        label: 'Minimize to tray instead of closing',
      },
    },
    {
      key: 'isNotifyWhenTimeEstimateExceeded',
      type: 'checkbox',
      templateOptions: {
        label: 'Notify when time estimate was exceeded',
      },
    },
    {
      key: 'isBlockFinishDayUntilTimeTimeTracked',
      type: 'checkbox',
      templateOptions: {
        label: 'Disable the finish day button until task list has been exported',
      },
    },
    {
      key: 'isHideNav',
      type: 'checkbox',
      templateOptions: {
        label: 'Hide navigation until main header is hovered (desktop only)',
      },
    },

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
  // isNotifyWhenTimeEstimateExceeded: false,
  // isBlockFinishDayUntilTimeTimeTracked: false,
  // isConfirmBeforeExit: false,
  // isShowTimeWorkedWithoutBreak: false,
  // isTakeABreakEnabled: false,
  // takeABreakMinWorkingTime: undefined,
  // isAutoStartNextTask: true,
  // isEnableIdleTimeTracking: true,
  // minIdleTime: moment.duration(5, 'minutes'),
  // isShortSyntaxEnabled: true,
  // /* tslint:disable-next-line */
  // takeABreakMessage: 'Take a break! You have been working for ${duration} without one. Go away from the computer! Take a short walk! Makes you more productive in the long run!',
};
// tslint:enable:max-line-length
