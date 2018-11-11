export const MISC_SETTINGS_FORM_CFG = {
  title: 'Misc Settings',
  key: 'misc',
  help: `<div class="mat-caption">Auto-start next task on done</div>
  <p>Decide if you want to automatically start the next task, once you mark a task as done.</p>

  <div class="mat-caption">Use short syntax</div>
  <p>The short syntax can be enabled to quickly create tasks with an estimation already set. If you enter 'TaskTitleBla
    t30m' a task with the name 'TaskTitleBla' will be created with the estimation set to 30 minutes.</p>

<!-- TODO solve -->
  <div ng-if="vm.IS_ELECTRON">
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
      key: 'isEnableIdleTimeTracking',
      type: 'checkbox',
      templateOptions: {
        label: 'Enable idle time handling',
      },
    },
    {
      key: 'minIdleTime',
      type: 'input',
      templateOptions: {
        label: 'Trigger idle after x ms',
      },
    },
    {
      key: 'isOnlyOpenIdleWhenCurrentTask',
      type: 'checkbox',
      templateOptions: {
        label: 'Only trigger idle time dialog when a current task is selected',
      },
    },
    {
      key: 'isDoNotMinimizeToTray',
      type: 'checkbox',
      templateOptions: {
        label: 'Do not minimize to tray when closing',
      },
    },
    {
      key: 'takeABreakMessage',
      type: 'input',
      templateOptions: {
        label: 'Take a break messsage',
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
