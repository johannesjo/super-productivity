// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {T} from '../../../t.const';

export const KEYBOARD_SETTINGS_FORM_CFG: ConfigFormSection = {
  title: T.F_KEYBOARD.TITLE,
  key: 'keyboard',
  /* tslint:disable */
  help: T.F_KEYBOARD.HELP,
  /* tslint:enable */
  items: [
    // SYSTEM WIDE
    {
      className: 'tpl',
      // TODO FIND a solution to translate
      template: ' <h3 class="sub-section-heading">Global Shortcuts (system wide)</h3>',
    },
    {
      key: 'globalShowHide',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.GLOBAL_SHOW_HIDE
      },
    },
    {
      key: 'globalToggleTaskStart',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.GLOBAL_TOGGLE_TASK_START
      },
    },
    // APP WIDE
    {
      className: 'tpl',
      template: `<h3 class="sub-section-heading">Global Shortcuts (application wide)</h3>`,
    },
    {
      key: 'addNewTask',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.ADD_NEW_TASK
      },
    },
    {
      key: 'addNewNote',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.ADD_NEW_NOTE
      },
    },
    {
      key: 'openProjectNotes',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.OPEN_PROJECT_NOTES
      },
    },
    // {
    //   key: 'openDistractionPanel',
    //   type: 'keyboard',
    //   templateOptions: {
    //     label: T.F_KEYBOARD.OPEN_DISTRACTION_PANEL
    //   },
    // },
    // {
    //   key: 'showHelp',
    //   type: 'keyboard',
    //   templateOptions: {
    //     label: T.F_KEYBOARD.SHOW_HELP
    //   },
    // },
    {
      key: 'toggleBookmarks',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.TOGGLE_BOOKMARKS
      },
    },
    {
      key: 'toggleBacklog',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.TOGGLE_BACKLOG
      },
    },
    {
      key: 'goToWorkView',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.GO_TO_WORK_VIEW
      },
    },
    {
      key: 'goToFocusMode',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.GO_TO_FOCUS_MODE
      },
    },
    {
      key: 'goToDailyAgenda',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.GO_TO_DAILY_AGENDA
      },
    },
    {
      key: 'goToSettings',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.GO_TO_SETTINGS
      },
    },
    {
      key: 'focusLastActiveTask',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.FOCUS_LAST_ACTIVE_TASK
      },
    },
    {
      key: 'zoomIn',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.ZOOM_IN
      },
    },
    {
      key: 'zoomOut',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.ZOOM_OUT
      },
    },
    {
      key: 'zoomDefault',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.ZOOM_DEFAULT
      },
    },
    // TASKS
    {
      className: 'tpl',
      /* tslint:disable */
      template: '<h3 class="sub-section-heading">Tasks</h3>\n<p>The following shortcuts apply for the currently selected task (selected via tab or mouse).</p>',
      /* tslint:enable */
    },
    {
      key: 'taskEditTitle',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.TASK_EDIT_TITLE
      },
    },
    {
      key: 'taskToggleAdditionalInfoOpen',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.TASK_TOGGLE_ADDITIONAL_INFO_OPEN
      },
    },
    {
      key: 'taskOpenEstimationDialog',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.TASK_OPEN_ESTIMATION_DIALOG
      },
    },
    {
      key: 'taskSchedule',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.TASK_SCHEDULE
      },
    },
    {
      key: 'taskToggleDone',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.TASK_TOGGLE_DONE
      },
    },
    {
      key: 'taskAddSubTask',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.TASK_ADD_SUB_TASK
      },
    },
    {
      key: 'taskDelete',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.TASK_DELETE
      },
    },
    {
      key: 'selectPreviousTask',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.SELECT_PREVIOUS_TASK
      },
    },
    {
      key: 'selectNextTask',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.SELECT_NEXT_TASK
      },
    },
    {
      key: 'moveTaskUp',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.MOVE_TASK_UP
      },
    },
    {
      key: 'moveTaskDown',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.MOVE_TASK_DOWN
      },
    },
    {
      key: 'moveToBacklog',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.MOVE_TO_BACKLOG
      },
    },
    {
      key: 'moveToTodaysTasks',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.MOVE_TO_TODAYS_TASKS
      },
    },
    {
      key: 'expandSubTasks',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.EXPAND_SUB_TASKS
      },
    },
    {
      key: 'collapseSubTasks',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.COLLAPSE_SUB_TASKS
      },
    },
    {
      key: 'togglePlay',
      type: 'keyboard',
      templateOptions: {
        label: T.F_KEYBOARD.TOGGLE_PLAY
      },
    },
  ]
};
// tslint:enable:max-line-length
