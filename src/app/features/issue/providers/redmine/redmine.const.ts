import { T } from '../../../../t.const';
import { RedmineCfg } from './redmine.model';
import { IssueProviderRedmine } from '../../issue.model';
import { ISSUE_PROVIDER_COMMON_FORM_FIELDS } from '../../common-issue-form-stuff.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';
import {
  IssueContentConfig,
  IssueFieldType,
  IssueProviderKey,
} from '../../issue-content/issue-content-config.model';

export const REDMINE_POLL_INTERVAL = 5 * 60 * 1000;
export const REDMINE_INITIAL_POLL_DELAY = 8 * 1000;

export const DEFAULT_REDMINE_CFG: RedmineCfg = {
  isEnabled: false,
  projectId: null,
  host: null,
  api_key: null,
  scope: 'assigned-to-me',
  isAutoPoll: false,
  isSearchIssuesFromRedmine: false,
  isAutoAddToBacklog: false,
};

export enum ScopeOptions {
  all = 'all',
  createdByMe = 'created-by-me',
  assignedToMe = 'assigned-to-me',
}

export const REDMINE_CONFIG_FORM: LimitedFormlyFieldConfig<IssueProviderRedmine>[] = [
  {
    key: 'host',
    type: 'input',

    templateOptions: {
      label: T.F.REDMINE.FORM.HOST,
      type: 'text',
      pattern: /^.+\/.+?$/i,
      required: true,
    },
  },
  {
    key: 'api_key',
    type: 'input',

    templateOptions: {
      label: T.F.REDMINE.FORM.API_KEY,
      required: true,
      type: 'password',
    },
  },
  {
    key: 'projectId',
    type: 'input',

    templateOptions: {
      label: T.F.REDMINE.FORM.PROJECT_ID,
      type: 'text',
      required: true,
      description: T.F.REDMINE.FORM.PROJECT_ID_DESCRIPTION,
    },
  },
  {
    key: 'scope',
    type: 'select',
    defaultValue: 'assigned-to-me',

    templateOptions: {
      required: true,
      label: T.F.REDMINE.FORM.SCOPE,
      options: [
        { value: ScopeOptions.all, label: T.F.REDMINE.FORM.SCOPE_ALL },
        { value: ScopeOptions.createdByMe, label: T.F.REDMINE.FORM.SCOPE_CREATED },
        { value: ScopeOptions.assignedToMe, label: T.F.REDMINE.FORM.SCOPE_ASSIGNED },
      ],
    },
  },
  {
    type: 'collapsible',
    // todo translate
    props: { label: 'Advanced Config' },
    fieldGroup: [...ISSUE_PROVIDER_COMMON_FORM_FIELDS],
  },
];

export const REDMINE_CONFIG_FORM_SECTION: ConfigFormSection<IssueProviderRedmine> = {
  title: T.F.REDMINE.FORM_SECTION.TITLE,
  key: 'REDMINE',
  items: REDMINE_CONFIG_FORM,
  help: T.F.REDMINE.FORM_SECTION.HELP,
};

export const REDMINE_ISSUE_CONTENT_CONFIG: IssueContentConfig = {
  issueType: 'REDMINE' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      field: 'id',
      type: IssueFieldType.LINK,
      getValue: (issue) => `#${issue.id} ${issue.subject}`,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
      field: 'status.name',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.PRIORITY,
      field: 'priority.name',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.AUTHOR,
      field: 'author.name',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
      field: 'assigned_to.name',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue.assigned_to,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.CATEGORY,
      field: 'category.name',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue.category,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.VERSION,
      field: 'fixed_version.name',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue.fixed_version,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DUE_DATE,
      field: 'due_date',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue.due_date,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SPENT_TIME,
      field: 'spent_hours',
      type: IssueFieldType.TEXT,
      getValue: (issue) => {
        const hours = Math.floor(issue.spent_hours);
        const minutes = Math.round((issue.spent_hours - hours) * 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      },
      isVisible: (issue) => issue.spent_hours > 0,
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
    authorField: 'user.name',
    bodyField: 'comments',
    createdField: 'created_on',
    sortField: 'created_on',
  },
  hasCollapsingComments: false,
};
