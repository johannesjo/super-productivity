import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';
import { IssueProviderKey } from '../../issue.model';

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
      label: T.F.ISSUE.ISSUE_CONTENT.TIME_SPENT,
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
