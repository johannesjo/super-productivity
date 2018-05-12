/**
 * @ngdoc constant
 * @name superProductivity.Dialogs
 * @description
 * # Dialogs
 * Constant in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .constant('DIALOGS', {
      DEFAULTS: {
        clickOutsideToClose: true,
        controllerAs: 'vm',
        bindToController: true
      },
      WELCOME: {
        controller: 'WelcomeCtrl',
        template: require('./welcome/welcome-c.html')
      },
      WAS_IDLE: {
        controller: 'WasIdleCtrl',
        template: require('./was-idle/was-idle-c.html')
      },
      ADD_TASK: {
        controller: 'AddTaskCtrl',
        template: require('./add-task/add-task-c.html')
      },
      TASK_SELECTION: {
        controller: 'TaskSelectionCtrl',
        template: require('./task-selection/task-selection-c.html')
      },
      TIME_ESTIMATE: {
        controller: 'TimeEstimateCtrl',
        template: require('./time-estimate/time-estimate-c.html')
      },
      CREATE_PROJECT: {
        controller: 'CreateProjectCtrl',
        template: require('./create-project/create-project-c.html')
      },
      NOTES: {
        controller: 'NotesCtrl',
        template: require('./notes/notes-c.html')
      },
      DISTRACTIONS: {
        controller: 'DistractionsCtrl',
        template: require('./distractions/distractions-c.html')
      },
      SIMPLE_TASK_SUMMARY: {
        controller: 'SimpleTaskSummaryCtrl',
        template: require('./simple-task-summary/simple-task-summary-c.html')
      },
      HELP: {
        controller: 'HelpCtrl',
        template: require('./help/help-c.html')
      },
      JIRA_SET_STATUS: {
        controller: 'JiraSetStatusCtrl',
        template: require('./jira-set-status/jira-set-status-c.html')
      },
      JIRA_ADD_WORKLOG: {
        controller: 'JiraAddWorklogCtrl',
        template: require('./jira-add-worklog/jira-add-worklog-c.html')
      },
      JIRA_ASSIGN_TICKET: {
        controller: 'JiraAssignTicketCtrl',
        template: require('./jira-assign-ticket/jira-assign-ticket-c.html')
      },
      EDIT_GLOBAL_LINK: {
        controller: 'EditGlobalLinkCtrl',
        template: require('./edit-global-link/edit-global-link-c.html')
      },
      POMODORO_BREAK: {
        controller: 'PomodoroBreakCtrl',
        template: require('./pomodoro-break/pomodoro-break-c.html')
      },
      TIME_SHEET_EXPORT: {
        controller: 'TimeSheetExportCtrl',
        template: require('./time-sheet-export/time-sheet-export-c.html')
      }
    });
})();
