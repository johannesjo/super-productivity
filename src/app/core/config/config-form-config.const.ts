export const GLOBAL_CONFIG_FORM_CONFIG = [
  // MISC SETTINGS
  // -------------
  {
    title: 'Misc Settings',
    key: 'misc',
    help: 'Bla bla blablab  balblabal',
    items: [
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
  },

  {
    title: 'Keyboard Shortcuts',
    key: 'keyboard',
    help: 'AAA',
    items: [
      {
        key: 'globalShowHide',
        type: 'keyboard',
        templateOptions: {
          label: 'Do not minimize to tray when closing',
        },
      },
      {
        key: 'goToDailyPlanner',
        type: 'keyboard',
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
  },
];
