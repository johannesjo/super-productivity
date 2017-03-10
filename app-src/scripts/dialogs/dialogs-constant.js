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
        templateUrl: 'scripts/dialogs/welcome/welcome-c.html'
      },
      WAS_IDLE: {
        controller: 'WasIdleCtrl',
        templateUrl: 'scripts/dialogs/was-idle/was-idle-c.html'
      },
      ADD_TASK: {
        controller: 'AddTaskCtrl',
        templateUrl: 'scripts/dialogs/add-task/add-task-c.html'
      },
      TASK_SELECTION: {
        controller: 'TaskSelectionCtrl',
        templateUrl: 'scripts/dialogs/task-selection/task-selection-c.html'
      },
      TIME_ESTIMATE: {
        controller: 'TimeEstimateCtrl',
        templateUrl: 'scripts/dialogs/time-estimate/time-estimate-c.html'
      },
      CREATE_PROJECT: {
        controller: 'CreateProjectCtrl',
        templateUrl: 'scripts/dialogs/create-project/create-project-c.html'
      },
      NOTES: {
        controller: 'NotesCtrl',
        templateUrl: 'scripts/dialogs/notes/notes-c.html'
      },
      DISTRACTIONS: {
        controller: 'DistractionsCtrl',
        templateUrl: 'scripts/dialogs/distractions/distractions-c.html'
      },
      SIMPLE_TASK_SUMMARY: {
        controller: 'SimpleTaskSummaryCtrl',
        templateUrl: 'scripts/dialogs/simple-task-summary/simple-task-summary-c.html'
      },
      HELP: {
        controller: 'HelpCtrl',
        templateUrl: 'scripts/dialogs/help/help-c.html'
      },
      JIRA_SET_IN_PROGRESS: {
        controller: 'JiraSetInProgressCtrl',
        templateUrl: 'scripts/dialogs/jira-set-in-progress/jira-set-in-progress-c.html'
      },
      JIRA_ADD_WORKLOG: {
        controller: 'JiraAddWorklogCtrl',
        templateUrl: 'scripts/dialogs/jira-add-worklog/jira-add-worklog-c.html'
      },
      JIRA_ASSIGN_TICKET: {
        controller: 'JiraAssignTicketCtrl',
        templateUrl: 'scripts/dialogs/jira-assign-ticket/jira-assign-ticket-c.html'
      }
    });
})();
