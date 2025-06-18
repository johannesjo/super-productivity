import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';
import { GithubIssue } from './github-issue.model';

export const GITHUB_ISSUE_CONTENT_CONFIG: IssueContentConfig<GithubIssue> = {
  issueType: 'GITHUB' as const,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      type: IssueFieldType.LINK,
      value: (issue: GithubIssue) => `${issue.title} #${issue.number}`,
      getLink: (issue: GithubIssue) => issue.html_url,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
      value: 'state',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
      type: IssueFieldType.LINK,
      value: (issue: GithubIssue) => issue.assignee?.login,
      getLink: (issue: GithubIssue) => issue.assignee?.html_url,
      isVisible: (issue: GithubIssue) => !!issue.assignee,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.LABELS,
      value: 'labels',
      type: IssueFieldType.CHIPS,
      isVisible: (issue: GithubIssue) => (issue.labels?.length ?? 0) > 0,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
      value: 'body',
      type: IssueFieldType.MARKDOWN,
      isVisible: (issue: GithubIssue) => !!issue.body,
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
  getIssueUrl: (issue) => (issue as any).html_url,
  hasCollapsingComments: true,
};
