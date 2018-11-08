export const GLOBAL_CONFIG_FORM_CONFIG = [
  // MISC SETTINGS
  // -------------
  {
    title: 'Misc Settings',
    key: 'misc',
    help: `  <div class="mat-caption">Auto-start next task on done</div>
  <p>Decide if you want to automatically start the next task, once you mark a task as done.</p>

  <div class="mat-caption">Use short syntax</div>
  <p>The short syntax can be enabled to quickly create tasks with an estimation already set. If you enter 'TaskTitleBla
    t30m' a task with the name 'TaskTitleBla' will be created with the estimation set to 30 minutes.</p>

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
  },

  {
    title: 'Keyboard Shortcuts',
    key: 'keyboard',
    /* tslint:disable */
    help: `  <p>Here you can configure all keyboard shortcuts.</p>
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
        key: 'goToDailyPlanner',
        type: 'keyboard',
        templateOptions: {
          label: 'Go to Daily Planner',
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
