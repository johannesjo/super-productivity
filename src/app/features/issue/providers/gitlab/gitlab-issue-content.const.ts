import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content-types.model';
import { IssueProviderKey } from '../../issue.model';

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
