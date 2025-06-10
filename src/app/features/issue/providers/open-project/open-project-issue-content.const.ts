import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content-types.model';
import { IssueProviderKey } from '../../issue.model';

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
      label: T.F.ISSUE.ISSUE_CONTENT.TIME_SPENT,
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
