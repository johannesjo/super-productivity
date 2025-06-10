import { T } from 'src/app/t.const';
import { IssueProviderKey } from '../issue.model';

export enum IssueFieldType {
  TEXT = 'text',
  LINK = 'link',
  CHIPS = 'chips',
  MARKDOWN = 'markdown',
  CUSTOM = 'custom',
}

export interface IssueFieldConfig {
  label: string;
  field: string;
  type: IssueFieldType;
  getValue?: (issue: any) => any;
  getLink?: (issue: any) => string;
  isVisible?: (issue: any) => boolean;
  customTemplate?: string;
}

export interface IssueCommentConfig {
  field: string;
  authorField: string;
  bodyField: string;
  createdField: string;
  avatarField?: string;
  sortField: string;
}

export interface IssueContentConfig {
  issueType: IssueProviderKey;
  fields: IssueFieldConfig[];
  comments?: IssueCommentConfig;
  getIssueUrl?: (issue: any) => string;
  hasCollapsingComments?: boolean;
}

export const ISSUE_CONTENT_CONFIGS: Record<IssueProviderKey, IssueContentConfig> = {
  GITHUB: {
    issueType: 'GITHUB',
    fields: [
      {
        label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
        field: 'title',
        type: IssueFieldType.LINK,
        getValue: (issue) => `${issue.title} #${issue.number}`,
        getLink: (issue) => issue.html_url,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
        field: 'state',
        type: IssueFieldType.TEXT,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
        field: 'assignee',
        type: IssueFieldType.LINK,
        getValue: (issue) => issue.assignee?.login,
        getLink: (issue) => issue.assignee?.html_url,
        isVisible: (issue) => !!issue.assignee?.html_url,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.LABELS,
        field: 'labels',
        type: IssueFieldType.CHIPS,
        getValue: (issue) =>
          issue.labels?.map((l: any) => ({ name: l.name, description: l.description })),
        isVisible: (issue) => issue.labels?.length > 0,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
        field: 'body',
        type: IssueFieldType.MARKDOWN,
        isVisible: (issue) => !!issue.body,
      },
    ],
    comments: {
      field: 'comments',
      authorField: 'user.login',
      bodyField: 'body',
      createdField: 'created_at',
      sortField: 'created_at',
    },
    getIssueUrl: (issue) => issue.html_url,
    hasCollapsingComments: true,
  },
  GITLAB: {
    issueType: 'GITLAB',
    fields: [
      {
        label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
        field: 'title',
        type: IssueFieldType.LINK,
        getValue: (issue) => `${issue.title} #${issue.number}`,
        getLink: (issue) => issue.html_url,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
        field: 'state',
        type: IssueFieldType.TEXT,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
        field: 'assignee',
        type: IssueFieldType.LINK,
        getValue: (issue) => issue.assignee?.username,
        getLink: (issue) => issue.assignee?.web_url,
        isVisible: (issue) => !!issue.assignee?.web_url,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.LABELS,
        field: 'labels',
        type: IssueFieldType.CHIPS,
        getValue: (issue) => issue.labels?.map((l: string) => ({ name: l })),
        isVisible: (issue) => issue.labels?.length > 0,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
        field: 'body',
        type: IssueFieldType.MARKDOWN,
        isVisible: (issue) => !!issue.body,
      },
    ],
    comments: {
      field: 'comments',
      authorField: 'author.username',
      bodyField: 'body',
      createdField: 'created_at',
      sortField: 'created_at',
    },
    getIssueUrl: (issue) => issue.url,
    hasCollapsingComments: true,
  },
  JIRA: {
    issueType: 'JIRA',
    fields: [
      {
        label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
        field: 'summary',
        type: IssueFieldType.LINK,
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
        type: IssueFieldType.CUSTOM,
        customTemplate: 'jira-worklog',
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
  },
  CALDAV: {
    issueType: 'CALDAV',
    fields: [
      {
        label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
        field: 'summary',
        type: IssueFieldType.TEXT,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
        field: 'completed',
        type: IssueFieldType.TEXT,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.LABELS,
        field: 'labels',
        type: IssueFieldType.CHIPS,
        getValue: (issue) => issue.labels?.map((l: string) => ({ name: l })),
        isVisible: (issue) => issue.labels?.length > 0,
      },
      {
        label: T.F.CALDAV.ISSUE_CONTENT.DESCRIPTION,
        field: 'note',
        type: IssueFieldType.MARKDOWN,
        isVisible: (issue) => !!issue.note,
      },
    ],
    getIssueUrl: (issue) => '',
  },
  GITEA: {
    issueType: 'GITEA',
    fields: [
      {
        label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
        field: 'title',
        type: IssueFieldType.LINK,
        getValue: (issue) => `${issue.title} #${issue.number}`,
        getLink: (issue) => issue.html_url,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
        field: 'state',
        type: IssueFieldType.TEXT,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
        field: 'assignee',
        type: IssueFieldType.LINK,
        getValue: (issue) => issue.assignee?.login,
        getLink: (issue) => issue.assignee?.html_url,
        isVisible: (issue) => !!issue.assignee?.html_url,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.LABELS,
        field: 'labels',
        type: IssueFieldType.CHIPS,
        getValue: (issue) =>
          issue.labels?.map((l: any) => ({ name: l.name, description: l.description })),
        isVisible: (issue) => issue.labels?.length > 0,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
        field: 'body',
        type: IssueFieldType.MARKDOWN,
        isVisible: (issue) => !!issue.body,
      },
    ],
    comments: {
      field: 'comments',
      authorField: 'user.login',
      bodyField: 'body',
      createdField: 'created_at',
      sortField: 'created_at',
    },
    getIssueUrl: (issue) => issue.html_url,
    hasCollapsingComments: true,
  },
  OPEN_PROJECT: {
    issueType: 'OPEN_PROJECT',
    fields: [
      {
        label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
        field: 'subject',
        type: IssueFieldType.LINK,
        getValue: (issue) => issue.subject,
        getLink: (issue) => '', // Will be handled by component
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
        field: '_links.status.title',
        type: IssueFieldType.TEXT,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
        field: '_links.assignee.title',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue._links?.assignee?.title,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.VERSION,
        field: '_links.version.title',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue._links?.version?.title,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.CATEGORY,
        field: '_links.category.title',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue._links?.category?.title,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.TIME_SPENT,
        field: 'spentTime',
        type: IssueFieldType.TEXT,
        customTemplate: 'open-project-spent-time',
        isVisible: (issue) => !!issue.spentTime,
        getValue: (issue) => issue.spentTime,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
        field: 'description.raw',
        type: IssueFieldType.MARKDOWN,
        isVisible: (issue) => !!issue.description?.raw,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.ATTACHMENTS,
        field: 'attachments',
        type: IssueFieldType.CUSTOM,
        customTemplate: 'open-project-attachments',
        isVisible: () => true, // Always show for Open Project
      },
    ],
  },
  REDMINE: {
    issueType: 'REDMINE',
    fields: [
      {
        label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
        field: 'subject',
        type: IssueFieldType.LINK,
        getValue: (issue) => `#${issue.id} ${issue.subject}`,
        getLink: (issue) => '', // Will be handled by component
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
        label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
        field: 'assigned_to.name',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue.assigned_to?.name,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.CATEGORY,
        field: 'category.name',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue.category?.name,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.VERSION,
        field: 'fixed_version.name',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue.fixed_version?.name,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.DUE_DATE,
        field: 'due_date',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue.due_date,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.DONE_RATIO,
        field: 'done_ratio',
        type: IssueFieldType.TEXT,
        getValue: (issue) => `${issue.done_ratio}%`,
        isVisible: (issue) => issue.done_ratio !== undefined,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.TIME_SPENT,
        field: 'spent_hours',
        type: IssueFieldType.CUSTOM,
        customTemplate: 'redmine-spent-time',
        isVisible: (issue) => !!issue.spent_hours || !!issue.total_spent_hours,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
        field: 'description',
        type: IssueFieldType.MARKDOWN,
        isVisible: (issue) => !!issue.description,
      },
    ],
  },
  ICAL: {
    issueType: 'ICAL',
    fields: [],
  },
};
