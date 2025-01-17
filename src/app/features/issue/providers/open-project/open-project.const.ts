// TODO use as a checklist
import { OpenProjectCfg } from './open-project.model';
import { T } from '../../../../t.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';
import { JIRA_WORK_LOG_EXPORT_FORM_OPTIONS } from '../jira/jira.const';
import { JiraWorklogExportDefaultTime } from '../jira/jira.model';
import { IssueProviderOpenProject } from '../../issue.model';
import { ISSUE_PROVIDER_COMMON_FORM_FIELDS } from '../../common-issue-form-stuff.const';

export const DEFAULT_OPEN_PROJECT_CFG: OpenProjectCfg = {
  isEnabled: false,
  host: null,
  projectId: null,
  token: null,
  isShowTimeTrackingDialog: false,
  isShowTimeTrackingDialogForEachSubTask: false,
  timeTrackingDialogDefaultTime: JiraWorklogExportDefaultTime.AllTime,
  filterUsername: null,
  scope: 'created-by-me',
  isTransitionIssuesEnabled: false,
  isSetProgressOnTaskDone: false,
  progressOnDone: 0,
  availableTransitions: [],
  transitionConfig: {
    // OPEN: 'DO_NOT',
    IN_PROGRESS: 'ALWAYS_ASK',
    DONE: 'ALWAYS_ASK',
  },
};

export const OPEN_PROJECT_POLL_INTERVAL = 5 * 60 * 1000;
export const OPEN_PROJECT_INITIAL_POLL_DELAY = 8 * 1000;

export const OPEN_PROJECT_CONFIG_FORM: LimitedFormlyFieldConfig<IssueProviderOpenProject>[] =
  [
    {
      key: 'host',
      type: 'input',

      templateOptions: {
        label: T.F.OPEN_PROJECT.FORM.HOST,
        type: 'text',
        pattern: /^.+\/.+?$/i,
        required: true,
      },
    },
    {
      key: 'token',
      type: 'input',

      templateOptions: {
        label: T.F.OPEN_PROJECT.FORM.TOKEN,
        required: true,
        type: 'password',
      },
    },
    {
      type: 'link',

      templateOptions: {
        url: 'https://www.openproject.org/docs/getting-started/my-account/#access-tokens',
        txt: T.F.ISSUE.HOW_TO_GET_A_TOKEN,
      },
    },
    {
      key: 'projectId',
      type: 'input',

      templateOptions: {
        label: T.F.OPEN_PROJECT.FORM.PROJECT_ID,
        type: 'text',
        required: true,
        description: T.F.OPEN_PROJECT.FORM.PROJECT_ID_DESCRIPTION,
      },
    },
    {
      key: 'scope',
      type: 'select',
      defaultValue: 'created-by-me',

      templateOptions: {
        required: true,
        label: T.F.OPEN_PROJECT.FORM.SCOPE,
        options: [
          { value: 'all', label: T.F.OPEN_PROJECT.FORM.SCOPE_ALL },
          { value: 'created-by-me', label: T.F.OPEN_PROJECT.FORM.SCOPE_CREATED },
          { value: 'assigned-to-me', label: T.F.OPEN_PROJECT.FORM.SCOPE_ASSIGNED },
        ],
      },
    },
    {
      type: 'collapsible',
      // todo translate
      props: { label: 'Advanced Config' },
      fieldGroup: [
        ...ISSUE_PROVIDER_COMMON_FORM_FIELDS,
        {
          key: 'isShowTimeTrackingDialog',
          type: 'checkbox',

          templateOptions: {
            label: T.F.OPEN_PROJECT.FORM.IS_SHOW_TIME_TRACKING_DIALOG,
            description: T.F.OPEN_PROJECT.FORM.IS_SHOW_TIME_TRACKING_DIALOG_DESCRIPTION,
          },
        },
        {
          key: 'isShowTimeTrackingDialogForEachSubTask',
          type: 'checkbox',
          hideExpression: (model: any) =>
            !model.isShowTimeTrackingDialog || !model.isEnabled,
          templateOptions: {
            label: T.F.OPEN_PROJECT.FORM.IS_SHOW_TIME_TRACKING_DIALOG_FOR_EACH_SUB_TASK,
          },
        },
        {
          key: 'timeTrackingDialogDefaultTime',
          type: 'select',
          hideExpression: (model: any) =>
            !model.isShowTimeTrackingDialog || !model.isEnabled,
          templateOptions: {
            label: T.F.JIRA.FORM_ADV.WORKLOG_DEFAULT_TIME_MODE,
            options: JIRA_WORK_LOG_EXPORT_FORM_OPTIONS,
          },
        },
        // TODO also remove translation and model if removing it for good
        // {
        //   key: 'filterUsername',
        //   type: 'input',
        //   templateOptions: {
        //     label: T.F.OPEN_PROJECT.FORM.FILTER_USER,
        //   },
        // },
      ],
    },
  ];

export const OPEN_PROJECT_CONFIG_FORM_SECTION: ConfigFormSection<IssueProviderOpenProject> =
  {
    title: 'Open Project',
    key: 'OPEN_PROJECT',
    customSection: 'OPENPROJECT_CFG',
    items: OPEN_PROJECT_CONFIG_FORM,
    help: T.F.OPEN_PROJECT.FORM_SECTION.HELP,
  };
