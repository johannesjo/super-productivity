// TODO use as a checklist
import {JiraCfg} from './jira';
import {FormlyFieldConfig} from '@ngx-formly/core';
import {GITHUB_INITIAL_POLL_DELAY} from '../github/github.const';
import {T} from '../../../t.const';
import {ConfigFormSection} from '../../config/global-config.model';

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

export const JIRA_CONFIG_FORM_SECTION: ConfigFormSection = {
  title: 'Jira',
  key: 'JIRA',
  customSection: 'JIRA_CFG',
  /* tslint:disable */
  help: `<div class="mat-caption">Basic configuration</div>
  <p>Please provide a login name (can be found on your profile page) and an
    <a href="https://confluence.atlassian.com/cloud/api-tokens-938839638.html"
       target="_blank">API token</a> or password if you can't generate one for some reason. Please not that newer versions of jira sometimes only work with the token.
  </p>
  <p>You also need to specify a JQL query which is used for the suggestions to add tasks from Jira. If you need help check out this link
    <a href="https://confluence.atlassian.com/jirasoftwarecloud/advanced-searching-764478330.html"
       target="_blank">https://confluence.atlassian.com/jirasoftwarecloud/advanced-searching-764478330.html</a>.</p>
  <p>You can also configure, if you want to automatically (e.g. every time you visit the planning view), to add all new tasks specified by a custom JQL query to the backlog.</p>
  <p>Another option is "Check if current ticket is assigned to current user". If enabled and you're starting, a check will be made if you're currently assigned to that ticket on Jira, if not an Dialog appears in which you can chose to assign the ticket to yourself.</p>


  <div class="mat-caption">Worklog settings</div>
  <p>There are several options to determine when and how you want to submit a worklog. Enabling
    <em>'Open worklog dialog for adding a worklog to Jira when task is done'</em> opens a dialog to add an worklog every time you mark a Jira Task as done. So keep in mind that worklogs will be added on top of everything tracked so far. So if you mark a task as done for a second time, you might not want to submit the complete worked time for the task again.
  </p>
  <p>
    <em>'Open worklog dialog when sub task is done and not for tasks with sub tasks themselves'</em> opens a worklog dialog every time when you mark a sub task of a Jira issue as done. Because you already track your time via the sub tasks, no dialog is opened once you mark the Jira task itself as done.
  </p>
  <p>
    <em>'Send updates to worklog automatically without dialog'</em> does what it says. Because marking a task as done several times leads to the whole worked time being tracked twice, this is not recommended.
  </p>

  <div class="mat-caption">Default transitions</div>
  <p>Here you can reconfigure your default transitions. Jira enables a wide configuration of transitions usually coming into action as different columns on your Jira agile board we can't make assumptions about where and when to transition your tasks and you need to set it manually.</p>`,
  /* tslint:enable */
  items: [
    {
      className: 'tpl',
      template: ' <h3 class="sub-section-heading">Credentials</h3>',
    },
    ...JIRA_CREDENTIALS_FORM_CFG,
    {
      className: 'tpl',
      template: ' <h3 class="sub-section-heading">Advanced Config</h3>',
    },
    ...JIRA_ADVANCED_FORM_CFG,
  ]
};
