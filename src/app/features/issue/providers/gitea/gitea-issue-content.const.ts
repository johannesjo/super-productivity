import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';
import { IssueProviderKey } from '../../issue.model';

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
