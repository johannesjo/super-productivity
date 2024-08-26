// TODO use as a checklist
import { JiraCfg, JiraWorklogExportDefaultTime } from './jira.model';
import { GITHUB_INITIAL_POLL_DELAY } from '../github/github.const';
import { T } from '../../../../t.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';

export const JIRA_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';

export const DEFAULT_JIRA_CFG: JiraCfg = {
  isEnabled: false,
  _isBlockAccess: false,
  host: null,
  userName: null,
  password: null,
  isWonkyCookieMode: false,
  usePAT: false,

  isAutoPollTickets: true,
  searchJqlQuery: '',

  isAutoAddToBacklog: true,
  autoAddBacklogJqlQuery:
    'assignee = currentUser() AND sprint in openSprints() AND resolution = Unresolved',

  isWorklogEnabled: true,
  isAddWorklogOnSubTaskDone: true,
  worklogDialogDefaultTime: JiraWorklogExportDefaultTime.AllTime,
  isAllowSelfSignedCertificate: false,
  isUpdateIssueFromLocal: false,

  isShowComponents: true,

  isCheckToReAssignTicketOnTaskStart: false,

  storyPointFieldId: null,

  isTransitionIssuesEnabled: true,

  availableTransitions: [],
  transitionConfig: {
    OPEN: 'DO_NOT',
    IN_PROGRESS: 'ALWAYS_ASK',
    DONE: 'ALWAYS_ASK',
  },
  userToAssignOnDone: null,
};

// export const JIRA_POLL_INTERVAL = 10 * 1000;
// export const JIRA_INITIAL_POLL_DELAY = 5000;

export const JIRA_POLL_INTERVAL = 5 * 60 * 1000;
export const JIRA_INITIAL_POLL_DELAY = GITHUB_INITIAL_POLL_DELAY + 4000;
export const JIRA_INITIAL_POLL_BACKLOG_DELAY = JIRA_INITIAL_POLL_DELAY + 10000;

// it's weird!!
export const JIRA_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';
export const JIRA_ISSUE_TYPE = 'JIRA';
export const JIRA_REQUEST_TIMEOUT_DURATION = 20000;
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
  'linkedIssues',
];

// there has to be one field otherwise we get all...
export const JIRA_REDUCED_ISSUE_FIELDS = [
  'summary',
  'updated',
  'timeestimate',
  'timespent',
];

export const JIRA_WORK_LOG_EXPORT_FORM_OPTIONS: {
  label: string;
  value: JiraWorklogExportDefaultTime;
}[] = [
  {
    label: T.F.JIRA.FORM_ADV.WORKLOG_DEFAULT_ALL_TIME,
    value: JiraWorklogExportDefaultTime.AllTime,
  },
  {
    label: T.F.JIRA.FORM_ADV.WORKLOG_DEFAULT_ALL_TIME_MINUS_LOGGED,
    value: JiraWorklogExportDefaultTime.AllTimeMinusLogged,
  },
  {
    label: T.F.JIRA.FORM_ADV.WORKLOG_DEFAULT_TODAY,
    value: JiraWorklogExportDefaultTime.TimeToday,
  },
  {
    label: T.F.JIRA.FORM_ADV.WORKLOG_DEFAULT_YESTERDAY,
    value: JiraWorklogExportDefaultTime.TimeYesterday,
  },
];

export const JIRA_WORK_LOG_EXPORT_CHECKBOXES: {
  label: string;
  value: JiraWorklogExportDefaultTime;
}[] = [
  {
    label: T.F.JIRA.DIALOG_WORKLOG.CHECKBOXES.ALL_TIME,
    value: JiraWorklogExportDefaultTime.AllTime,
  },
  {
    label: T.F.JIRA.DIALOG_WORKLOG.CHECKBOXES.ALL_TIME_MINUS_LOGGED,
    value: JiraWorklogExportDefaultTime.AllTimeMinusLogged,
  },
  {
    label: T.F.JIRA.DIALOG_WORKLOG.CHECKBOXES.TIME_SPENT_TODAY,
    value: JiraWorklogExportDefaultTime.TimeToday,
  },
  {
    label: T.F.JIRA.DIALOG_WORKLOG.CHECKBOXES.TIME_SPENT_YESTERDAY,
    value: JiraWorklogExportDefaultTime.TimeYesterday,
  },
];

export const JIRA_CREDENTIALS_FORM_CFG: LimitedFormlyFieldConfig<JiraCfg>[] = [
  {
    key: 'host',
    type: 'input',
    templateOptions: {
      type: 'url',
      /* eslint-disable-next-line */
      pattern:
        /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/i,
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
    },
  },
  {
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      url: 'https://confluence.atlassian.com/cloud/api-tokens-938839638.html',
      txt: T.F.ISSUE.HOW_TO_GET_A_TOKEN,
      type: 'url',
    },
  },
  {
    key: 'isAllowSelfSignedCertificate',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_CRED.ALLOW_SELF_SIGNED,
    },
  },
  {
    key: 'isWonkyCookieMode',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_CRED.WONKY_COOKIE_MODE,
    },
  },
  {
    key: 'usePAT',
    type: 'checkbox',
    templateOptions: {
      required: false,
      label: T.F.JIRA.FORM_CRED.USE_PAT,
    },
  },
];

export const JIRA_ADVANCED_FORM_CFG: LimitedFormlyFieldConfig<JiraCfg>[] = [
  {
    key: 'isAutoPollTickets',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.IS_AUTO_POLL_TICKETS,
    },
  },
  {
    key: 'isCheckToReAssignTicketOnTaskStart',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.IS_CHECK_TO_RE_ASSIGN_TICKET_ON_TASK_START,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.IS_AUTO_IMPORT_ISSUES,
    },
  },
  {
    key: 'autoAddBacklogJqlQuery',
    type: 'input',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.AUTO_ADD_BACKLOG_JQL_QUERY,
    },
  },
  {
    key: 'searchJqlQuery',
    type: 'input',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.SEARCH_JQL_QUERY,
    },
  },
  {
    key: 'isWorklogEnabled',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.IS_WORKLOG_ENABLED,
    },
  },
  {
    key: 'isAddWorklogOnSubTaskDone',
    type: 'checkbox',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.IS_ADD_WORKLOG_ON_SUB_TASK_DONE,
    },
  },
  {
    hideExpression: (model: any) => {
      return !model.isWorklogEnabled;
    },
    key: 'worklogDialogDefaultTime',
    type: 'select',
    templateOptions: {
      label: T.F.JIRA.FORM_ADV.WORKLOG_DEFAULT_TIME_MODE,
      options: JIRA_WORK_LOG_EXPORT_FORM_OPTIONS,
    },
  },
];

export const JIRA_CONFIG_FORM_SECTION: ConfigFormSection<JiraCfg> = {
  title: 'Jira',
  key: JIRA_ISSUE_TYPE,
  customSection: 'JIRA_CFG',
  helpArr: [
    {
      h: T.F.JIRA.FORM_SECTION.HELP_ARR.H1,
      p: T.F.JIRA.FORM_SECTION.HELP_ARR.P1_1,
      p2: T.F.JIRA.FORM_SECTION.HELP_ARR.P1_2,
      p3: T.F.JIRA.FORM_SECTION.HELP_ARR.P1_3,
      p4: T.F.JIRA.FORM_SECTION.HELP_ARR.P1_4,
    },
    {
      h: T.F.JIRA.FORM_SECTION.HELP_ARR.H2,
      p: T.F.JIRA.FORM_SECTION.HELP_ARR.P2_1,
      p2: T.F.JIRA.FORM_SECTION.HELP_ARR.P2_2,
      p3: T.F.JIRA.FORM_SECTION.HELP_ARR.P2_3,
    },
    {
      h: T.F.JIRA.FORM_SECTION.HELP_ARR.H3,
      p: T.F.JIRA.FORM_SECTION.HELP_ARR.P3_1,
    },
  ],
  items: [
    {
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'h3',
        class: 'sub-section-heading',
        text: T.F.JIRA.FORM_SECTION.CREDENTIALS,
      },
    },
    ...JIRA_CREDENTIALS_FORM_CFG,
    {
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'h3',
        class: 'sub-section-heading',
        text: T.F.JIRA.FORM_SECTION.ADV_CFG,
      },
    },
    ...JIRA_ADVANCED_FORM_CFG,
  ],
};
