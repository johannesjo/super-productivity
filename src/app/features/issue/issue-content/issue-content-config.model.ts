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

export const GITHUB_ISSUE_CONTENT_CONFIG: IssueContentConfig = {
  issueType: 'GITHUB' as IssueProviderKey,
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
      isVisible: (issue) => !!issue.assignee,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.LABELS,
      field: 'labels',
      type: IssueFieldType.CHIPS,
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
    avatarField: 'user.avatar_url',
    sortField: 'created_at',
  },
  getIssueUrl: (issue) => issue.html_url,
  hasCollapsingComments: true,
};

export const GITLAB_ISSUE_CONTENT_CONFIG: IssueContentConfig = {
  issueType: 'GITLAB' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      field: 'title',
      type: IssueFieldType.LINK,
      getValue: (issue) => `${issue.title} #${issue.number}`,
      getLink: (issue) => issue.url,
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
};

export const JIRA_ISSUE_CONTENT_CONFIG: IssueContentConfig = {
  issueType: 'JIRA' as IssueProviderKey,
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

export const CALDAV_ISSUE_CONTENT_CONFIG: IssueContentConfig = {
  issueType: 'CALDAV' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      field: 'summary',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
      field: 'description',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue.description,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.LOCATION,
      field: 'location',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue.location,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.START,
      field: 'start',
      type: IssueFieldType.TEXT,
    },
  ],
};

export const GITEA_ISSUE_CONTENT_CONFIG: IssueContentConfig = {
  issueType: 'GITEA' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      field: 'title',
      type: IssueFieldType.LINK,
      getValue: (issue) => `${issue.title} #${issue.number}`,
      getLink: (issue) => issue.url,
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
  getIssueUrl: (issue) => issue.url,
  hasCollapsingComments: true,
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

export const OPEN_PROJECT_ISSUE_CONTENT_CONFIG: IssueContentConfig = {
  issueType: 'OPEN_PROJECT' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      field: 'subject',
      type: IssueFieldType.LINK,
      getValue: (issue) => `#${issue.id} ${issue.subject}`,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.TYPE,
      field: '_embedded.type.name',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
      field: '_embedded.status.name',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.PRIORITY,
      field: '_embedded.priority.name',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.AUTHOR,
      field: '_embedded.author.name',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue._embedded?.author,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
      field: '_embedded.assignee.name',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue._embedded?.assignee,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SPENT_TIME,
      field: 'spentTime',
      type: IssueFieldType.CUSTOM,
      customTemplate: 'open-project-spent-time',
      getValue: (issue) => issue.spentTime,
      isVisible: (issue) => issue.spentTime !== 'PT0S',
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.ATTACHMENTS,
      field: 'attachments',
      type: IssueFieldType.CUSTOM,
      customTemplate: 'open-project-attachments',
      isVisible: () => true,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
      field: 'description.raw',
      type: IssueFieldType.MARKDOWN,
      isVisible: (issue) => !!issue.description?.raw,
    },
  ],
  comments: {
    field: 'comments',
    authorField: '_embedded.user.name',
    bodyField: 'raw',
    createdField: 'createdAt',
    avatarField: '_embedded.user.avatar',
    sortField: 'createdAt',
  },
  hasCollapsingComments: true,
};

export const ISSUE_CONTENT_CONFIGS: Record<IssueProviderKey, IssueContentConfig> = {
  GITHUB: GITHUB_ISSUE_CONTENT_CONFIG,
  GITLAB: GITLAB_ISSUE_CONTENT_CONFIG,
  JIRA: JIRA_ISSUE_CONTENT_CONFIG,
  CALDAV: CALDAV_ISSUE_CONTENT_CONFIG,
  GITEA: GITEA_ISSUE_CONTENT_CONFIG,
  REDMINE: REDMINE_ISSUE_CONTENT_CONFIG,
  OPEN_PROJECT: OPEN_PROJECT_ISSUE_CONTENT_CONFIG,
};
