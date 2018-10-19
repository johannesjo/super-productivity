// TODO use as a checklist
import { JiraCfg } from './jira';
import { FormlyFieldConfig } from '@ngx-formly/core';

export const DEFAULT_JIRA_CFG: JiraCfg = {
  isEnabled: true,
  host: null,
  userName: null,
  password: null,
  token: null,

  isAutoPollTickets: true,
  searchJqlQuery: 'assignee = currentUser() AND resolution = Unresolved ORDER BY updatedDate DESC',

  isAutoAddToBacklog: true,
  autoAddBacklogJqlQuery: 'assignee = currentUser() AND sprint in openSprints() AND resolution = Unresolved ORDER BY updatedDate DESC',

  isWorklogEnabled: true,
  isAutoWorklog: false,
  isAddWorklogOnSubTaskDone: true,

  isUpdateIssueFromLocal: false,

  isShowComponents: true,

  isCheckToReAssignTicketOnTaskStart: true,
  userAssigneeName: null,

  isTransitionIssuesEnabled: true,
  availableTransitions: {
    OPEN: 'ALWAYS_ASK',
    IN_PROGRESS: 'ALWAYS_ASK',
    DONE: 'ALWAYS_ASK'
  },
  userToAssignOnDone: null
};


export const IPC_JIRA_CB_EVENT = 'JIRA_RESPONSE';
export const IPC_JIRA_MAKE_REQUEST_EVENT = 'JIRA';

// it's weird!!
export const JIRA_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';

export const JIRA_REQUEST_TIMEOUT_DURATION = 10000;
export const JIRA_MAX_RESULTS = 100;
export const JIRA_ISSUE_TYPE = 'JIRA';
export const JIRA_SUGGESTION_FIELDS_TO_GET = [
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
];

export const JIRA_CREDENTIALS_FORM_CFG: FormlyFieldConfig[] = [
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
    },
  },
];

export const JIRA_ADVANCED_FORM_CFG: FormlyFieldConfig[] = [
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
      label: 'Automatically add issues to Jira backlog',
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
