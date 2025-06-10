import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';

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
