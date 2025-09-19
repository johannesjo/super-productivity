/* eslint-disable max-len */
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
  MiscConfig,
} from '../global-config.model';
import { T } from '../../../t.const';
import { IS_ELECTRON } from '../../../app.constants';
import { AVAILABLE_CUSTOM_THEMES } from '../../../core/theme/custom-theme.service';

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
    ...((IS_ELECTRON
      ? [
          {
            key: 'isConfirmBeforeExitWithoutFinishDay',
            type: 'checkbox',
            templateOptions: {
              label: T.GCF.MISC.IS_CONFIRM_BEFORE_EXIT_WITHOUT_FINISH_DAY,
            },
          },
        ]
      : [
          {
            key: 'isConfirmBeforeExit',
            type: 'checkbox',
            templateOptions: {
              label: T.GCF.MISC.IS_CONFIRM_BEFORE_EXIT,
            },
          },
        ]) as LimitedFormlyFieldConfig<MiscConfig>[]),
    {
      key: 'isAutMarkParentAsDone',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_AUTO_MARK_PARENT_AS_DONE,
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
      key: 'startOfNextDay',
      type: 'input',
      defaultValue: 0,
      templateOptions: {
        required: true,
        label: T.GCF.MISC.START_OF_NEXT_DAY,
        description: T.GCF.MISC.START_OF_NEXT_DAY_HINT,
        type: 'number',
        min: 0,
        max: 23,
      },
    },
    {
      key: 'taskNotesTpl',
      type: 'textarea',
      templateOptions: {
        rows: 5,
        label: T.GCF.MISC.TASK_NOTES_TPL,
      },
    },
    {
      key: 'isDisableAnimations',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_DISABLE_ANIMATIONS,
      },
    },
    {
      key: 'isDisableProductivityTips',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_DISABLE_PRODUCTIVITY_TIPS,
      },
    },
    {
      key: 'isTrayShowCurrentCountdown',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_TRAY_SHOW_CURRENT_COUNTDOWN,
      },
    },
    {
      key: 'isOverlayIndicatorEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_OVERLAY_INDICATOR_ENABLED,
      },
      hideExpression: (model: any) => !model?.isTrayShowCurrentTask,
    },
    {
      key: 'customTheme',
      type: 'select',
      templateOptions: {
        label: T.GCF.MISC.THEME,
        options: AVAILABLE_CUSTOM_THEMES.map((theme) => ({
          label: theme.name,
          value: theme.id,
        })),
      },
    },
  ],
};
