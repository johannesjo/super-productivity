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
  updateButtonLabel: string;
  fields: IssueFieldConfig[];
  comments?: IssueCommentConfig;
  writeCommentLabel: string;
  getIssueUrl: (issue: any) => string;
  hasCollapsingComments?: boolean;
  loadAllCommentsLabel?: string;
  lastCommentLabel?: string;
}

export const ISSUE_CONTENT_CONFIGS: Record<IssueProviderKey, IssueContentConfig> = {
  GITHUB: {
    issueType: 'GITHUB',
    updateButtonLabel: 'F.GITHUB.ISSUE_CONTENT.MARK_AS_CHECKED',
    fields: [
      {
        label: 'F.GITHUB.ISSUE_CONTENT.SUMMARY',
        field: 'title',
        type: IssueFieldType.LINK,
        getValue: (issue) => `${issue.title} #${issue.number}`,
        getLink: (issue) => issue.html_url,
      },
      {
        label: 'F.GITHUB.ISSUE_CONTENT.STATUS',
        field: 'state',
        type: IssueFieldType.TEXT,
      },
      {
        label: 'F.GITHUB.ISSUE_CONTENT.ASSIGNEE',
        field: 'assignee',
        type: IssueFieldType.LINK,
        getValue: (issue) => issue.assignee?.login,
        getLink: (issue) => issue.assignee?.html_url,
        isVisible: (issue) => !!issue.assignee?.html_url,
      },
      {
        label: 'F.GITHUB.ISSUE_CONTENT.LABELS',
        field: 'labels',
        type: IssueFieldType.CHIPS,
        getValue: (issue) =>
          issue.labels?.map((l: any) => ({ name: l.name, description: l.description })),
        isVisible: (issue) => issue.labels?.length > 0,
      },
      {
        label: 'F.GITHUB.ISSUE_CONTENT.DESCRIPTION',
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
    writeCommentLabel: 'F.GITHUB.ISSUE_CONTENT.WRITE_A_COMMENT',
    getIssueUrl: (issue) => issue.html_url,
    hasCollapsingComments: true,
    loadAllCommentsLabel: 'F.GITHUB.ISSUE_CONTENT.LOAD_ALL_COMMENTS',
    lastCommentLabel: 'F.GITHUB.ISSUE_CONTENT.LAST_COMMENT',
  },
  GITLAB: {
    issueType: 'GITLAB',
    updateButtonLabel: 'F.GITLAB.ISSUE_CONTENT.MARK_AS_CHECKED',
    fields: [
      {
        label: 'F.GITLAB.ISSUE_CONTENT.SUMMARY',
        field: 'title',
        type: IssueFieldType.LINK,
        getValue: (issue) => `${issue.title} #${issue.number}`,
        getLink: (issue) => issue.html_url,
      },
      {
        label: 'F.GITLAB.ISSUE_CONTENT.STATUS',
        field: 'state',
        type: IssueFieldType.TEXT,
      },
      {
        label: 'F.GITLAB.ISSUE_CONTENT.ASSIGNEE',
        field: 'assignee',
        type: IssueFieldType.LINK,
        getValue: (issue) => issue.assignee?.username,
        getLink: (issue) => issue.assignee?.web_url,
        isVisible: (issue) => !!issue.assignee?.web_url,
      },
      {
        label: 'F.GITLAB.ISSUE_CONTENT.LABELS',
        field: 'labels',
        type: IssueFieldType.CHIPS,
        getValue: (issue) => issue.labels?.map((l: string) => ({ name: l })),
        isVisible: (issue) => issue.labels?.length > 0,
      },
      {
        label: 'F.GITLAB.ISSUE_CONTENT.DESCRIPTION',
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
    writeCommentLabel: 'F.GITLAB.ISSUE_CONTENT.WRITE_A_COMMENT',
    getIssueUrl: (issue) => issue.url,
    hasCollapsingComments: true,
    loadAllCommentsLabel: 'F.GITLAB.ISSUE_CONTENT.LOAD_ALL_COMMENTS',
    lastCommentLabel: 'F.GITLAB.ISSUE_CONTENT.LAST_COMMENT',
  },
  JIRA: {
    issueType: 'JIRA',
    updateButtonLabel: 'F.JIRA.ISSUE_CONTENT.MARK_AS_CHECKED',
    fields: [
      {
        label: 'F.JIRA.ISSUE_CONTENT.SUMMARY',
        field: 'summary',
        type: IssueFieldType.LINK,
        getValue: (issue) => `${issue.key} ${issue.summary}`,
        getLink: (issue) => '', // Will be handled by component with issueUrl$ observable
      },
      {
        label: 'F.JIRA.ISSUE_CONTENT.STATUS',
        field: 'status',
        type: IssueFieldType.TEXT,
        getValue: (issue) => issue.status?.name,
      },
      {
        label: 'F.JIRA.ISSUE_CONTENT.STORY_POINTS',
        field: 'storyPoints',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue.storyPoints,
      },
      {
        label: 'F.JIRA.ISSUE_CONTENT.ASSIGNEE',
        field: 'assignee',
        type: IssueFieldType.TEXT,
        getValue: (issue) => issue.assignee?.displayName || '–',
      },
      {
        label: 'F.JIRA.ISSUE_CONTENT.WORKLOG',
        field: 'worklog',
        type: IssueFieldType.CUSTOM,
        customTemplate: 'jira-worklog',
        isVisible: (issue) => !!issue.timespent || !!issue.timeestimate,
      },
      {
        label: 'F.JIRA.ISSUE_CONTENT.SUB_TASKS',
        field: 'subtasks',
        type: IssueFieldType.CUSTOM,
        customTemplate: 'jira-subtasks',
        isVisible: (issue) => false, // Will be handled by observable
      },
      {
        label: 'F.JIRA.ISSUE_CONTENT.RELATED',
        field: 'related',
        type: IssueFieldType.CUSTOM,
        customTemplate: 'jira-related',
        isVisible: (issue) => false, // Will be handled by observable
      },
      {
        label: 'F.JIRA.ISSUE_CONTENT.COMPONENTS',
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
        label: 'F.JIRA.ISSUE_CONTENT.ATTACHMENTS',
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
        label: 'F.JIRA.ISSUE_CONTENT.DESCRIPTION',
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
    writeCommentLabel: 'F.JIRA.ISSUE_CONTENT.WRITE_A_COMMENT',
    getIssueUrl: (issue) => '', // Will be handled by component
    hasCollapsingComments: true,
    loadAllCommentsLabel: 'F.JIRA.ISSUE_CONTENT.LOAD_ALL_COMMENTS',
    lastCommentLabel: 'F.JIRA.ISSUE_CONTENT.LAST_COMMENT',
  },
  CALDAV: {
    issueType: 'CALDAV',
    updateButtonLabel: 'F.CALDAV.ISSUE_CONTENT.MARK_AS_CHECKED',
    fields: [
      {
        label: 'F.CALDAV.ISSUE_CONTENT.SUMMARY',
        field: 'summary',
        type: IssueFieldType.TEXT,
      },
      {
        label: 'F.CALDAV.ISSUE_CONTENT.STATUS',
        field: 'completed',
        type: IssueFieldType.TEXT,
      },
      {
        label: 'F.CALDAV.ISSUE_CONTENT.LABELS',
        field: 'labels',
        type: IssueFieldType.CHIPS,
        getValue: (issue) => issue.labels?.map((l: string) => ({ name: l })),
        isVisible: (issue) => issue.labels?.length > 0,
      },
      {
        label: 'F.CALDAV.ISSUE_CONTENT.DESCRIPTION',
        field: 'note',
        type: IssueFieldType.MARKDOWN,
        isVisible: (issue) => !!issue.note,
      },
    ],
    writeCommentLabel: '',
    getIssueUrl: (issue) => '',
  },
  GITEA: {
    issueType: 'GITEA',
    updateButtonLabel: 'F.GITEA.ISSUE_CONTENT.MARK_AS_CHECKED',
    fields: [
      {
        label: 'F.GITEA.ISSUE_CONTENT.SUMMARY',
        field: 'title',
        type: IssueFieldType.LINK,
        getValue: (issue) => `${issue.title} #${issue.number}`,
        getLink: (issue) => issue.html_url,
      },
      {
        label: 'F.GITEA.ISSUE_CONTENT.STATUS',
        field: 'state',
        type: IssueFieldType.TEXT,
      },
      {
        label: 'F.GITEA.ISSUE_CONTENT.ASSIGNEE',
        field: 'assignee',
        type: IssueFieldType.LINK,
        getValue: (issue) => issue.assignee?.login,
        getLink: (issue) => issue.assignee?.html_url,
        isVisible: (issue) => !!issue.assignee?.html_url,
      },
      {
        label: 'F.GITEA.ISSUE_CONTENT.LABELS',
        field: 'labels',
        type: IssueFieldType.CHIPS,
        getValue: (issue) =>
          issue.labels?.map((l: any) => ({ name: l.name, description: l.description })),
        isVisible: (issue) => issue.labels?.length > 0,
      },
      {
        label: 'F.GITEA.ISSUE_CONTENT.DESCRIPTION',
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
    writeCommentLabel: 'F.GITEA.ISSUE_CONTENT.WRITE_A_COMMENT',
    getIssueUrl: (issue) => issue.html_url,
    hasCollapsingComments: true,
    loadAllCommentsLabel: 'F.GITEA.ISSUE_CONTENT.LOAD_ALL_COMMENTS',
    lastCommentLabel: 'F.GITEA.ISSUE_CONTENT.LAST_COMMENT',
  },
  OPEN_PROJECT: {
    issueType: 'OPEN_PROJECT',
    updateButtonLabel: 'F.OPEN_PROJECT.ISSUE_CONTENT.MARK_AS_CHECKED',
    fields: [
      {
        label: 'F.OPEN_PROJECT.ISSUE_CONTENT.SUMMARY',
        field: 'subject',
        type: IssueFieldType.LINK,
        getValue: (issue) => issue.subject,
        getLink: (issue) => '', // Will be handled by component
      },
      {
        label: 'F.OPEN_PROJECT.ISSUE_CONTENT.STATUS',
        field: '_links.status.title',
        type: IssueFieldType.TEXT,
      },
      {
        label: 'F.OPEN_PROJECT.ISSUE_CONTENT.ASSIGNEE',
        field: '_links.assignee.title',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue._links?.assignee?.title,
      },
      {
        label: 'F.OPEN_PROJECT.ISSUE_CONTENT.VERSION',
        field: '_links.version.title',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue._links?.version?.title,
      },
      {
        label: 'F.OPEN_PROJECT.ISSUE_CONTENT.CATEGORY',
        field: '_links.category.title',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue._links?.category?.title,
      },
      {
        label: 'F.OPEN_PROJECT.ISSUE_CONTENT.SPENT_TIME',
        field: 'spentTime',
        type: IssueFieldType.CUSTOM,
        customTemplate: 'open-project-spent-time',
        isVisible: (issue) => !!issue.spentTime,
      },
      {
        label: 'F.OPEN_PROJECT.ISSUE_CONTENT.DESCRIPTION',
        field: 'description.raw',
        type: IssueFieldType.MARKDOWN,
        isVisible: (issue) => !!issue.description?.raw,
      },
      {
        label: 'F.OPEN_PROJECT.ISSUE_CONTENT.ATTACHMENTS',
        field: 'attachments',
        type: IssueFieldType.CUSTOM,
        customTemplate: 'open-project-attachments',
        isVisible: () => true, // Always show for Open Project
      },
    ],
    writeCommentLabel: '',
    getIssueUrl: (issue) => '', // Will be handled by component
  },
  REDMINE: {
    issueType: 'REDMINE',
    updateButtonLabel: 'F.REDMINE.ISSUE_CONTENT.MARK_AS_CHECKED',
    fields: [
      {
        label: 'F.REDMINE.ISSUE_CONTENT.SUMMARY',
        field: 'subject',
        type: IssueFieldType.LINK,
        getValue: (issue) => `#${issue.id} ${issue.subject}`,
        getLink: (issue) => '', // Will be handled by component
      },
      {
        label: 'F.REDMINE.ISSUE_CONTENT.STATUS',
        field: 'status.name',
        type: IssueFieldType.TEXT,
      },
      {
        label: 'F.REDMINE.ISSUE_CONTENT.PRIORITY',
        field: 'priority.name',
        type: IssueFieldType.TEXT,
      },
      {
        label: 'F.REDMINE.ISSUE_CONTENT.ASSIGNEE',
        field: 'assigned_to.name',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue.assigned_to?.name,
      },
      {
        label: 'F.REDMINE.ISSUE_CONTENT.CATEGORY',
        field: 'category.name',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue.category?.name,
      },
      {
        label: 'F.REDMINE.ISSUE_CONTENT.VERSION',
        field: 'fixed_version.name',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue.fixed_version?.name,
      },
      {
        label: 'F.REDMINE.ISSUE_CONTENT.DUE_DATE',
        field: 'due_date',
        type: IssueFieldType.TEXT,
        isVisible: (issue) => !!issue.due_date,
      },
      {
        label: 'F.REDMINE.ISSUE_CONTENT.DONE_RATIO',
        field: 'done_ratio',
        type: IssueFieldType.TEXT,
        getValue: (issue) => `${issue.done_ratio}%`,
        isVisible: (issue) => issue.done_ratio !== undefined,
      },
      {
        label: 'F.REDMINE.ISSUE_CONTENT.SPENT_TIME',
        field: 'spent_hours',
        type: IssueFieldType.CUSTOM,
        customTemplate: 'redmine-spent-time',
        isVisible: (issue) => !!issue.spent_hours || !!issue.total_spent_hours,
      },
      {
        label: 'F.REDMINE.ISSUE_CONTENT.DESCRIPTION',
        field: 'description',
        type: IssueFieldType.MARKDOWN,
        isVisible: (issue) => !!issue.description,
      },
    ],
    writeCommentLabel: 'F.REDMINE.ISSUE_CONTENT.WRITE_A_COMMENT',
    getIssueUrl: (issue) => '', // Will be handled by component
  },
  ICAL: {
    issueType: 'ICAL',
    updateButtonLabel: '',
    fields: [],
    writeCommentLabel: '',
    getIssueUrl: (issue) => '',
  },
};
