import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';
import { IssueProviderKey } from '../../issue.model';
import { GitlabIssue } from './gitlab-issue/gitlab-issue.model';

export const GITLAB_ISSUE_CONTENT_CONFIG: IssueContentConfig<GitlabIssue> = {
  issueType: 'GITLAB' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      field: 'title',
      type: IssueFieldType.LINK,
      getValue: (issue: GitlabIssue) => `${issue.title} #${issue.number}`,
      getLink: (issue: GitlabIssue) => issue.html_url,
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
      getValue: (issue: GitlabIssue) => issue.assignee?.username,
      getLink: (issue: GitlabIssue) => (issue.assignee as any)?.web_url || '',
      isVisible: (issue: GitlabIssue) => !!issue.assignee,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.LABELS,
      field: 'labels',
      type: IssueFieldType.CHIPS,
      getValue: (issue: GitlabIssue) => issue.labels?.map((l: string) => ({ name: l })),
      isVisible: (issue: GitlabIssue) => (issue.labels?.length ?? 0) > 0,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
      field: 'body',
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
  getIssueUrl: (issue) => (issue as any).url,
  hasCollapsingComments: true,
};
