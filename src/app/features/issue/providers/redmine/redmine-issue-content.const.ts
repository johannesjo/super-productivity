import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';
import { RedmineIssue } from './redmine-issue.model';
import { IssueProviderKey } from '../../issue.model';

export const REDMINE_ISSUE_CONTENT_CONFIG: IssueContentConfig<RedmineIssue> = {
  issueType: 'REDMINE' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      type: IssueFieldType.LINK,
      value: (issue: RedmineIssue) => `#${issue.id} ${issue.subject}`,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
      value: 'status.name',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.PRIORITY,
      value: 'priority.name',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.AUTHOR,
      value: 'author.name',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
      value: 'assigned_to.name',
      type: IssueFieldType.TEXT,
      isVisible: (issue: RedmineIssue) => !!(issue as any).assigned_to,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.CATEGORY,
      value: 'category.name',
      type: IssueFieldType.TEXT,
      isVisible: (issue: RedmineIssue) => !!issue.category,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.VERSION,
      value: 'fixed_version.name',
      type: IssueFieldType.TEXT,
      isVisible: (issue: RedmineIssue) => !!(issue as any).fixed_version,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DUE_DATE,
      value: 'due_date',
      type: IssueFieldType.TEXT,
      isVisible: (issue: RedmineIssue) => !!(issue as any).due_date,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.TIME_SPENT,
      type: IssueFieldType.TEXT,
      value: (issue: RedmineIssue) => {
        const hours = Math.floor((issue as any).spent_hours);
        const minutes = Math.round(((issue as any).spent_hours - hours) * 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      },
      isVisible: (issue: RedmineIssue) => (issue as any).spent_hours > 0,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
      value: 'description',
      type: IssueFieldType.MARKDOWN,
      isVisible: (issue: RedmineIssue) => !!issue.description,
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
