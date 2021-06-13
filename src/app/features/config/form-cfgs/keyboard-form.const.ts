/* eslint-disable max-len */
import { ConfigFormSection, LimitedFormlyFieldConfig } from '../global-config.model';
import { T } from '../../../t.const';
import { IS_ELECTRON } from '../../../app.constants';
import { KeyboardConfig } from '../keyboard-config.model';

export const KEYBOARD_SETTINGS_FORM_CFG: ConfigFormSection<KeyboardConfig> = {
  title: T.GCF.KEYBOARD.TITLE,
  key: 'keyboard',
  help: T.GCF.KEYBOARD.HELP,
  items: [
    // SYSTEM WIDE
    ...((IS_ELECTRON
      ? [
          {
            type: 'tpl',
            className: 'tpl',
            templateOptions: {
              tag: 'h3',
              class: 'sub-section-heading',
              text: T.GCF.KEYBOARD.SYSTEM_SHORTCUTS,
            },
          },
          {
            key: 'globalShowHide',
            type: 'keyboard',
            templateOptions: {
              label: T.GCF.KEYBOARD.GLOBAL_SHOW_HIDE,
            },
          },
          {
            key: 'globalToggleTaskStart',
            type: 'keyboard',
            templateOptions: {
              label: T.GCF.KEYBOARD.GLOBAL_TOGGLE_TASK_START,
            },
          },
          {
            key: 'globalAddNote',
            type: 'keyboard',
            templateOptions: {
              label: T.GCF.KEYBOARD.GLOBAL_ADD_NOTE,
            },
          },
          {
            key: 'globalAddTask',
            type: 'keyboard',
            templateOptions: {
              label: T.GCF.KEYBOARD.GLOBAL_ADD_TASK,
            },
          },
        ]
      : []) as LimitedFormlyFieldConfig<KeyboardConfig>[]),
    // APP WIDE
    {
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'h3',
        class: 'sub-section-heading',
        text: T.GCF.KEYBOARD.APP_WIDE_SHORTCUTS,
      },
    },
    {
      key: 'addNewTask',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.ADD_NEW_TASK,
      },
    },
    {
      key: 'addNewNote',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.ADD_NEW_NOTE,
      },
    },
    {
      key: 'toggleSideNav',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TOGGLE_SIDE_NAV,
      },
    },
    {
      key: 'openProjectNotes',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.OPEN_PROJECT_NOTES,
      },
    },
    // {
    //   key: 'showHelp',
    //   type: 'keyboard',
    //   templateOptions: {
    //     label: T.GCF.KEYBOARD.SHOW_HELP
    //   },
    // },
    {
      key: 'showSearchBar',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.SHOW_SEARCH_BAR,
      },
    },
    {
      key: 'toggleBookmarks',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TOGGLE_BOOKMARKS,
      },
    },
    {
      key: 'toggleBacklog',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TOGGLE_BACKLOG,
      },
    },
    {
      key: 'goToWorkView',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.GO_TO_WORK_VIEW,
      },
    },
    {
      key: 'goToTimeline',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.GO_TO_TIMELINE,
      },
    },
    {
      key: 'goToScheduledView',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.GO_TO_SCHEDULED_VIEW,
      },
    },
    // {
    //   key: 'goToFocusMode',
    //   type: 'keyboard',
    //   templateOptions: {
    //     label: T.GCF.KEYBOARD.GO_TO_FOCUS_MODE
    //   },
    // },
    // {
    //   key: 'goToDailyAgenda',
    //   type: 'keyboard',
    //   templateOptions: {
    //     label: T.GCF.KEYBOARD.GO_TO_DAILY_AGENDA
    //   },
    // },
    {
      key: 'goToSettings',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.GO_TO_SETTINGS,
      },
    },
    {
      key: 'zoomIn',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.ZOOM_IN,
      },
    },
    {
      key: 'zoomOut',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.ZOOM_OUT,
      },
    },
    {
      key: 'zoomDefault',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.ZOOM_DEFAULT,
      },
    },
    // TASKS
    {
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'h3',
        class: 'sub-section-heading',
        text: T.GCF.KEYBOARD.TASK_SHORTCUTS,
      },
    },
    {
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'p',
        text: T.GCF.KEYBOARD.TASK_SHORTCUTS_INFO,
      },
    },
    {
      key: 'taskEditTitle',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TASK_EDIT_TITLE,
      },
    },
    {
      key: 'taskToggleAdditionalInfoOpen',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TASK_TOGGLE_ADDITIONAL_INFO_OPEN,
      },
    },
    {
      key: 'taskOpenEstimationDialog',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TASK_OPEN_ESTIMATION_DIALOG,
      },
    },
    {
      key: 'taskSchedule',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TASK_SCHEDULE,
      },
    },
    {
      key: 'taskToggleDone',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TASK_TOGGLE_DONE,
      },
    },
    {
      key: 'taskAddSubTask',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TASK_ADD_SUB_TASK,
      },
    },
    {
      key: 'taskDelete',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TASK_DELETE,
      },
    },
    {
      key: 'taskMoveToProject',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TASK_MOVE_TO_PROJECT,
      },
    },
    {
      key: 'taskOpenContextMenu',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TASK_OPEN_CONTEXT_MENU,
      },
    },
    {
      key: 'selectPreviousTask',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.SELECT_PREVIOUS_TASK,
      },
    },
    {
      key: 'selectNextTask',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.SELECT_NEXT_TASK,
      },
    },
    {
      key: 'moveTaskUp',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.MOVE_TASK_UP,
      },
    },
    {
      key: 'moveTaskDown',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.MOVE_TASK_DOWN,
      },
    },
    {
      key: 'moveToBacklog',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.MOVE_TO_BACKLOG,
      },
    },
    {
      key: 'moveToTodaysTasks',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.MOVE_TO_TODAYS_TASKS,
      },
    },
    {
      key: 'expandSubTasks',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.EXPAND_SUB_TASKS,
      },
    },
    {
      key: 'collapseSubTasks',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.COLLAPSE_SUB_TASKS,
      },
    },
    {
      key: 'togglePlay',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TOGGLE_PLAY,
      },
    },
    {
      key: 'taskEditTags',
      type: 'keyboard',
      templateOptions: {
        label: T.GCF.KEYBOARD.TASK_EDIT_TAGS,
      },
    },
  ],
};
/* eslint-enable max-len */
