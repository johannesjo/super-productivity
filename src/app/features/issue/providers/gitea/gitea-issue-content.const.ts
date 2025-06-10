import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';
import { GiteaIssue } from './gitea-issue/gitea-issue.model';
import { IssueProviderKey } from '../../issue.model';

export const GITEA_ISSUE_CONTENT_CONFIG: IssueContentConfig<GiteaIssue> = {
  issueType: 'GITEA' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      field: 'title',
      type: IssueFieldType.LINK,
      getValue: (issue: GiteaIssue) => `${issue.title} #${issue.number}`,
      getLink: (issue: GiteaIssue) => issue.html_url,
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
      getValue: (issue: GiteaIssue) => issue.assignee?.login,
      getLink: (issue: GiteaIssue) => (issue as any).assignee?.html_url || '',
      isVisible: (issue: GiteaIssue) => !!issue.assignee,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.LABELS,
      field: 'labels',
      type: IssueFieldType.CHIPS,
      isVisible: (issue: GiteaIssue) => (issue.labels?.length ?? 0) > 0,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
      field: 'body',
      type: IssueFieldType.MARKDOWN,
      isVisible: (issue: GiteaIssue) => !!issue.body,
    },
  ],
  comments: {
    field: 'comments',
    authorField: 'user.login',
    bodyField: 'body',
    createdField: 'created_at',
    sortField: 'created_at',
  },
  getIssueUrl: (issue) => (issue as any).url,
  hasCollapsingComments: true,
};
