import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';
import { IssueProviderKey } from '../../issue.model';
import { GitlabIssue } from './gitlab-issue.model';

export const GITLAB_ISSUE_CONTENT_CONFIG: IssueContentConfig<GitlabIssue> = {
  issueType: 'GITLAB' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      type: IssueFieldType.LINK,
      value: (issue: GitlabIssue) => `${issue.title} #${issue.number}`,
      getLink: (issue: GitlabIssue) => issue.html_url,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
      value: 'state',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
      type: IssueFieldType.LINK,
      value: (issue: GitlabIssue) => issue.assignee?.username,
      getLink: (issue: GitlabIssue) => issue.assignee?.web_url || '',
      isVisible: (issue: GitlabIssue) => !!issue.assignee,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.LABELS,
      type: IssueFieldType.CHIPS,
      value: (issue: GitlabIssue) => issue.labels?.map((l: string) => ({ name: l })),
      isVisible: (issue: GitlabIssue) => (issue.labels?.length ?? 0) > 0,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
      value: 'body',
      type: IssueFieldType.MARKDOWN,
      isVisible: (issue: GitlabIssue) => !!issue.body,
    },
  ],
  comments: {
    field: 'comments',
    authorField: 'author.username',
    bodyField: 'body',
    createdField: 'created_at',
    sortField: 'created_at',
  },
  getIssueUrl: (issue: GitlabIssue) => issue.url,
  hasCollapsingComments: true,
};
