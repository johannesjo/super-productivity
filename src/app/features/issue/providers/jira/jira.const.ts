// TODO use as a checklist
import { JiraCfg, JiraWorklogExportDefaultTime } from './jira.model';
import { GITHUB_INITIAL_POLL_DELAY } from '../github/github.const';
import { T } from '../../../../t.const';
import { ConfigFormSection } from '../../../config/global-config.model';
import { IssueProviderJira } from '../../issue.model';
import { ISSUE_PROVIDER_COMMON_FORM_FIELDS } from '../../common-issue-form-stuff.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content-config.model';

export const JIRA_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';

export const DEFAULT_JIRA_CFG: JiraCfg = {
  isEnabled: false,
  _isBlockAccess: false,
  host: null,
  userName: null,
  password: null,
  usePAT: false,

  searchJqlQuery: '',

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
    // OPEN: 'DO_NOT',
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

export const JIRA_CONFIG_FORM_SECTION: ConfigFormSection<IssueProviderJira> = {
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
      key: 'host',
      type: 'input',
      templateOptions: {
        type: 'url',
        /* eslint-disable-next-line */
        pattern:
          /^(http(s)?:\/\/)?(localhost|[\w.\-]+(?:\.[\w\.\-]+)+)(:\d+)?(\/[^\s]*)?$/i,
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
      type: 'link',
      templateOptions: {
        url: 'https://confluence.atlassian.com/cloud/api-tokens-938839638.html',
        txt: T.F.ISSUE.HOW_TO_GET_A_TOKEN,
        type: 'url',
      },
    },

    {
      type: 'collapsible',
      props: { label: T.G.ADVANCED_CFG },
      fieldGroup: [
        // {
        //   key: 'isAllowSelfSignedCertificate',
        //   type: 'checkbox',
        //   templateOptions: {
        //     label: T.F.JIRA.FORM_CRED.ALLOW_SELF_SIGNED,
        //   },
        // },
        {
          key: 'usePAT',
          type: 'checkbox',
          templateOptions: {
            required: false,
            label: T.F.JIRA.FORM_CRED.USE_PAT,
          },
        },

        ...ISSUE_PROVIDER_COMMON_FORM_FIELDS,

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
          key: 'isCheckToReAssignTicketOnTaskStart',
          type: 'checkbox',
          templateOptions: {
            label: T.F.JIRA.FORM_ADV.IS_CHECK_TO_RE_ASSIGN_TICKET_ON_TASK_START,
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
      ],
    },
  ],
};

export const JIRA_ISSUE_CONTENT_CONFIG: IssueContentConfig = {
  issueType: 'JIRA' as const,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      field: 'summary',
      type: IssueFieldType.CUSTOM,
      customTemplate: 'jira-link',
      getValue: (issue) => `${issue.key} ${issue.summary}`,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
      field: 'status',
      type: IssueFieldType.TEXT,
      getValue: (issue) => issue.status?.name,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.STORY_POINTS,
      field: 'storyPoints',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue.storyPoints,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
      field: 'assignee',
      type: IssueFieldType.TEXT,
      getValue: (issue) => issue.assignee?.displayName || '–',
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.WORKLOG,
      field: 'worklog',
      type: IssueFieldType.TEXT,
      getValue: (issue) => {
        const timeSpent = issue.timespent ? issue.timespent * 1000 : 0;
        const timeEstimate = issue.timeestimate ? issue.timeestimate * 1000 : 0;
        const formatMs = (ms: number): string => {
          const hours = Math.floor(ms / (1000 * 60 * 60));
          const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
          return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        };
        return `${formatMs(timeSpent)} / ${formatMs(timeEstimate)}`;
      },
      isVisible: (issue) => !!issue.timespent || !!issue.timeestimate,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUB_TASKS,
      field: 'subtasks',
      type: IssueFieldType.CUSTOM,
      customTemplate: 'jira-subtasks',
      isVisible: (issue) => false, // Will be handled by observable
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.RELATED,
      field: 'related',
      type: IssueFieldType.CUSTOM,
      customTemplate: 'jira-related',
      isVisible: (issue) => false, // Will be handled by observable
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.COMPONENTS,
      field: 'components',
      type: IssueFieldType.CHIPS,
      getValue: (issue) =>
        issue.components?.map((c: any) => ({
          name: c.name,
          description: c.description,
        })),
      isVisible: (issue) => issue.components?.length > 0,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.ATTACHMENTS,
      field: 'attachments',
      type: IssueFieldType.CHIPS,
      getValue: (issue) =>
        issue.attachments?.map((attachment: any) => ({
          name: attachment.filename,
          description: `${attachment.size} bytes`,
        })),
      isVisible: (issue) => issue.attachments?.length > 0,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
      field: 'description',
      type: IssueFieldType.MARKDOWN,
      isVisible: (issue) => !!issue.description,
    },
  ],
  comments: {
    field: 'comments',
    authorField: 'author.displayName',
    bodyField: 'body',
    createdField: 'created',
    avatarField: 'author.avatarUrl',
    sortField: 'created',
  },
  hasCollapsingComments: true,
};
