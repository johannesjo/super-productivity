// tslint:disable:max-line-length
export const KEYBOARD_SETTINGS_FORM_CFG = {
  title: 'Keyboard Shortcuts',
  key: 'keyboard',
  /* tslint:disable */
  help: `<p>Here you can configure all keyboard shortcuts.</p>
  <p>Click on the text input and enter the desired keyboard combination. Hit enter to save and Escape to abort.</p>
  <p>There are three types of shortcuts:</p>
  <ul>
    <li>
      <strong>Global shortcuts:</strong> When the app is running it will trigger the action from every other application.
    </li>
    <li>
      <strong>Application level shortcuts:</strong> Will trigger from every screen of the application, but not if you're currently editing a text field.
    </li>
    <li>
      <strong>Task level shortcuts:</strong> They will only trigger if you have selected a task via mouse or keyboard and usually trigger an action specifically related to that one task.
    </li>
  </ul>`,
  /* tslint:enable */
  items: [
    // SYSTEM WIDE
    {
      className: 'tpl',
      template: ' <h3 class="md-caption">Global Shortcuts (system wide)</h3>',
    },
    {
      key: 'globalShowHide',
      type: 'keyboard',
      templateOptions: {
        label: 'Show/Hide Super Productivity',
      },
    },
    // APP WIDE
    {
      className: 'tpl',
      template: `<h3 class="md-caption">Global Shortcuts (application wide)</h3>`,
    },
    {
      key: 'addNewTask',
      type: 'keyboard',
      templateOptions: {
        label: 'Add New Task',
      },
    },
    {
      key: 'addNewNote',
      type: 'keyboard',
      templateOptions: {
        label: 'Add new note',
      },
    },
    {
      key: 'openProjectNotes',
      type: 'keyboard',
      templateOptions: {
        label: 'Open Project Notes',
      },
    },
    {
      key: 'openDistractionPanel',
      type: 'keyboard',
      templateOptions: {
        label: 'Open Distraction Panel',
      },
    },
    {
      key: 'showHelp',
      type: 'keyboard',
      templateOptions: {
        label: 'Show Help',
      },
    },
    {
      key: 'toggleBacklog',
      type: 'keyboard',
      templateOptions: {
        label: 'Show Task Backlog',
      },
    },
    {
      key: 'goToWorkView',
      type: 'keyboard',
      templateOptions: {
        label: 'Go to Work View',
      },
    },
    {
      key: 'goToFocusMode',
      type: 'keyboard',
      templateOptions: {
        label: 'Go to Focus Mode',
      },
    },
    {
      key: 'goToDailyAgenda',
      type: 'keyboard',
      templateOptions: {
        label: 'Go to Agenda',
      },
    },
    {
      key: 'goToSettings',
      type: 'keyboard',
      templateOptions: {
        label: 'Go to Settings',
      },
    },
    {
      key: 'focusLastActiveTask',
      type: 'keyboard',
      templateOptions: {
        label: 'Focus last active task',
      },
    },
    // TASKS
    {
      className: 'tpl',
      template: '<h3 class="md-caption">Tasks</h3>\n<p>The following shortcuts apply for the currently selected task (selected via tab or mouse).</p>',
    },
    {
      key: 'taskEditTitle',
      type: 'keyboard',
      templateOptions: {
        label: 'Edit Title',
      },
    },
    {
      key: 'taskToggleNotes',
      type: 'keyboard',
      templateOptions: {
        label: 'Show/Hide Notes',
      },
    },
    {
      key: 'taskOpenEstimationDialog',
      type: 'keyboard',
      templateOptions: {
        label: 'Edit estimation / time spent',
      },
    },
    {
      key: 'taskToggleDone',
      type: 'keyboard',
      templateOptions: {
        label: 'Toggle Done',
      },
    },
    {
      key: 'taskAddSubTask',
      type: 'keyboard',
      templateOptions: {
        label: 'Add sub Task',
      },
    },
    {
      key: 'taskDelete',
      type: 'keyboard',
      templateOptions: {
        label: 'Delete Task',
      },
    },
    {
      key: 'selectPreviousTask',
      type: 'keyboard',
      templateOptions: {
        label: 'Select previous Task',
      },
    },
    {
      key: 'selectNextTask',
      type: 'keyboard',
      templateOptions: {
        label: 'Select next Task',
      },
    },
    {
      key: 'moveTaskUp',
      type: 'keyboard',
      templateOptions: {
        label: 'Move Task up in List',
      },
    },
    {
      key: 'moveTaskDown',
      type: 'keyboard',
      templateOptions: {
        label: 'Move Task down in List',
      },
    },
    {
      key: 'moveToBacklog',
      type: 'keyboard',
      templateOptions: {
        label: 'Move Task to Task Backlog',
      },
    },
    {
      key: 'moveToTodaysTasks',
      type: 'keyboard',
      templateOptions: {
        label: 'Move Task to Today\'s Task List',
      },
    },
    {
      key: 'expandSubTasks',
      type: 'keyboard',
      templateOptions: {
        label: 'Expand Sub Tasks',
      },
    },
    {
      key: 'collapseSubTasks',
      type: 'keyboard',
      templateOptions: {
        label: 'Collapse Sub Tasks',
      },
    },
    {
      key: 'togglePlay',
      type: 'keyboard',
      templateOptions: {
        label: 'Start/Stop Task',
      },
    },
  ]
};
// tslint:enable:max-line-length
