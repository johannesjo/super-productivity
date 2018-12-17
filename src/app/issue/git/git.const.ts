// TODO use as a checklist
import { GitCfg } from './git';
import { FormlyFieldConfig } from '@ngx-formly/core';

export const DEFAULT_GIT_CFG: GitCfg = {
  isShowIssuesFromGit: false,
  isAutoPoll: false,
  isAutoImportToBacklog: false,
  repo: null,
};


export const GIT_POLL_INTERVAL = 5 * 60 * 1000;

// it's weird!!
export const GIT_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';
export const GIT_ISSUE_TYPE = 'GIT';
export const GIT_REQUEST_TIMEOUT_DURATION = 12000;
export const GIT_MAX_RESULTS = 100;
export const GIT_ADDITIONAL_ISSUE_FIELDS = [
  'assignee',
  'summary',
  'description',
  'timeestimate',
  'timespent',
  'status',
  'attachment',
  'comment',
  'updated',
  'components',
  'subtasks',
];

// there has to be one field otherwise we get all...
export const GIT_REDUCED_ISSUE_FIELDS = [
  'summary',
  'updated',
  'timeestimate',
  'timespent',
];

export const GIT_CREDENTIALS_FORM_CFG: FormlyFieldConfig[] = [
  {
    key: 'host',
    type: 'input',
    templateOptions: {
      required: true,
      label: 'Host',
    },
  },
  {
    key: 'userName',
    type: 'input',
    templateOptions: {
      required: true,
      label: 'Email / Username',
    },
  },
  {
    key: 'password',
    type: 'input',
    templateOptions: {
      required: true,
      label: 'Password / Token',
      type: 'password'
    },
  },
];

export const GIT_ADVANCED_FORM_CFG: FormlyFieldConfig[] = [
  {
    key: 'isAutoPollTickets',
    type: 'checkbox',
    templateOptions: {
      label: 'Check imported issues for changes automatically and notify',
    },
  },
  {
    key: 'isCheckToReAssignTicketOnTaskStart',
    type: 'checkbox',
    templateOptions: {
      label: 'Check if the currently worked on issue is assigned to current user',
    },
  },
  {
    key: 'userAssigneeName',
    type: 'input',
    templateOptions: {
      label: 'Assignee name to check for',
    },
    hideExpression: '!model.isCheckToReAssignTicketOnTaskStart',
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    templateOptions: {
      label: 'Automatically add issues to Git backlog',
    },
  },
  {
    key: 'autoAddBacklogJqlQuery',
    type: 'input',
    templateOptions: {
      label: 'JQL used for adding tasks automatically to backlog',
    },
  },
  {
    key: 'searchJqlQuery',
    type: 'input',
    templateOptions: {
      label: 'JQL Query for to limit the searcher tasks',
    },
  },

];
