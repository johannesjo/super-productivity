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
  }
// pomodoro: PomodoroConfig;
// googleDriveSync: GoogleDriveSyncConfig;
// keyboard: KeyboardConfig;
// _uiHelper: UiHelperSettings;
// _dailyTaskExportSettings: DailyTaskExportSettings;
// _timeSheetExportSettings: TimeSheetExportSettings;
// _timeTrackingHistoryExportSettings: TimeTrackingHistoryExportSettings;
// _csvExportSettings: CsvExportSettings;
// _dailyAgenda: DailyAgendaSettings;
// _googleTokens: GoogleTokensSettings;
];
