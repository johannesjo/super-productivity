/* eslint-disable max-len */
import { ConfigFormSection, MiscConfig } from '../global-config.model';
import { T } from '../../../t.const';

export const MISC_SETTINGS_FORM_CFG: ConfigFormSection<MiscConfig> = {
  title: T.GCF.MISC.TITLE,
  key: 'misc',
  help: T.GCF.MISC.HELP,
  items: [
    // {
    //   key: 'isDarkMode',
    //   type: 'checkbox',
    //   templateOptions: {
    //     label: T.GCF.MISC.IS_DARK_MODE,
    //   },
    // },
    {
      key: 'isConfirmBeforeExit',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_CONFIRM_BEFORE_EXIT,
      },
    },
    {
      key: 'isNotifyWhenTimeEstimateExceeded',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_NOTIFY_WHEN_TIME_ESTIMATE_EXCEEDED,
      },
    },
    {
      key: 'isAutMarkParentAsDone',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_AUTO_MARK_PARENT_AS_DONE,
      },
    },
    {
      key: 'isAutoStartNextTask',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_AUTO_START_NEXT_TASK,
      },
    },
    {
      key: 'isTurnOffMarkdown',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_TURN_OFF_MARKDOWN,
      },
    },
    {
      key: 'isDisableInitialDialog',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_DISABLE_INITIAL_DIALOG,
      },
    },
    {
      key: 'isAutoAddWorkedOnToToday',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_AUTO_ADD_WORKED_ON_TO_TODAY,
      },
    },
    {
      key: 'isMinimizeToTray',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_MINIMIZE_TO_TRAY,
      },
    },
    {
      key: 'isTrayShowCurrentTask',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_TRAY_SHOW_CURRENT_TASK,
      },
    },
    {
      key: 'defaultProjectId',
      type: 'project-select',
      templateOptions: {
        label: T.GCF.MISC.DEFAULT_PROJECT,
      },
    },
    {
      key: 'firstDayOfWeek',
      type: 'select',
      templateOptions: {
        label: T.GCF.MISC.FIRST_DAY_OF_WEEK,
        options: [
          { label: T.F.TASK_REPEAT.F.SUNDAY, value: 0 },
          { label: T.F.TASK_REPEAT.F.MONDAY, value: 1 },
          { label: T.F.TASK_REPEAT.F.TUESDAY, value: 2 },
          { label: T.F.TASK_REPEAT.F.WEDNESDAY, value: 3 },
          { label: T.F.TASK_REPEAT.F.THURSDAY, value: 4 },
          { label: T.F.TASK_REPEAT.F.FRIDAY, value: 5 },
          { label: T.F.TASK_REPEAT.F.SATURDAY, value: 6 },
        ],
      },
    },
    {
      key: 'taskNotesTpl',
      type: 'textarea',
      templateOptions: {
        label: T.GCF.MISC.TASK_NOTES_TPL,
      },
    },
  ],
};
