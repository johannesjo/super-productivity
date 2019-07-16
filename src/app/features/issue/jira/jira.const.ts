// TODO use as a checklist
import {JiraCfg} from './jira';
import {FormlyFieldConfig} from '@ngx-formly/core';
import {GITHUB_INITIAL_POLL_DELAY} from '../github/github.const';
import {T} from '../../../t.const';

export const JIRA_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';

export const DEFAULT_JIRA_CFG: JiraCfg = {
  isEnabled: false,
  _isBlockAccess: false,
  host: null,
  userName: null,
  password: null,

  isAutoPollTickets: true,
  searchJqlQuery: '',

  isAutoAddToBacklog: true,
  autoAddBacklogJqlQuery: 'assignee = currentUser() AND sprint in openSprints() AND resolution = Unresolved',

  isWorklogEnabled: true,
  isAutoWorklog: false,
  isAddWorklogOnSubTaskDone: true,

  isUpdateIssueFromLocal: false,

  isShowComponents: true,

  isCheckToReAssignTicketOnTaskStart: false,
  userAssigneeName: null,

  storyPointFieldId: null,

  isTransitionIssuesEnabled: true,

  availableTransitions: [],
  transitionConfig: {
    // OPEN: 'DO_NOT',
    IN_PROGRESS: 'ALWAYS_ASK',
    DONE: 'ALWAYS_ASK'
  },
  userToAssignOnDone: null
};

// export const JIRA_POLL_INTERVAL = 10 * 1000;
// export const JIRA_INITIAL_POLL_DELAY = 5000;

export const JIRA_POLL_INTERVAL = 5 * 60 * 1000;
export const JIRA_INITIAL_POLL_DELAY = GITHUB_INITIAL_POLL_DELAY + 5000;
export const JIRA_INITIAL_POLL_BACKLOG_DELAY = JIRA_INITIAL_POLL_DELAY + 10 * 1000;

// it's weird!!
export const JIRA_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';
export const JIRA_ISSUE_TYPE = 'JIRA';
export const JIRA_REQUEST_TIMEOUT_DURATION = 12000;
export const JIRA_MAX_RESULTS = 100;
export const JIRA_ADDITIONAL_ISSUE_FIELDS = [
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
export const JIRA_REDUCED_ISSUE_FIELDS = [
  'summary',
  'updated',
  'timeestimate',
  'timespent',
];

export const JIRA_CREDENTIALS_FORM_CFG: FormlyFieldConfig[] = [
  {
    key: 'host',
    type: 'input',
    templateOptions: {
      type: 'url',
      /* tslint:disable-next-line */
      pattern: /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/i,
      required: true,
      label: T.F.JIRA.FORM_CRED.HOST,
    },
  },
  {
    key: 'userName',
    type: 'input',
    templateOptions: {
      required: true,
      label: T.F.JIRA.FORM_CRED.USER_NAME,
    },
  },
  {
    key: 'password',
    type: 'input',
    templateOptions: {
      required: true,
      label: T.F.JIRA.FORM_CRED.PASSWORD,
      type: 'password',
      description: '* https://confluence.atlassian.com/cloud/api-tokens-938839638.html'
    },
  },
];


export const JIRA_ADVANCED_FORM_CFG: FormlyFieldConfig[] = [
  {
    key: 'isAutoPollTickets',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.IS_AUTO_POLL_TICKETS
    },
  },
  {
    key: 'isCheckToReAssignTicketOnTaskStart',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.IS_CHECK_TO_RE_ASSIGN_TICKET_ON_TASK_START
    },
  },
  {
    key: 'userAssigneeName',
    type: 'input',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.USER_ASSIGNEE_NAME,
      required: true,
    },
    hideExpression: '!model.isCheckToReAssignTicketOnTaskStart',
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.IS_AUTO_ADD_TO_BACKLOG
    },
  },
  {
    key: 'autoAddBacklogJqlQuery',
    type: 'input',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.AUTO_ADD_BACKLOG_JQL_QUERY
    },
  },
  {
    key: 'searchJqlQuery',
    type: 'input',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.SEARCH_JQL_QUERY
    },
  },
  {
    key: 'isWorklogEnabled',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.IS_WORKLOG_ENABLED
    },
  },
  {
    key: 'isAddWorklogOnSubTaskDone',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.IS_ADD_WORKLOG_ON_SUB_TASK_DONE
    },
  },
];
