import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';
import { IssueProviderKey } from '../../issue.model';
import { OpenProjectWorkPackage } from './open-project-issue.model';

export const OPEN_PROJECT_ISSUE_CONTENT_CONFIG: IssueContentConfig<OpenProjectWorkPackage> =
  {
    issueType: 'OPEN_PROJECT' as IssueProviderKey,
    fields: [
      {
        label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
        type: IssueFieldType.LINK,
        value: (issue: OpenProjectWorkPackage) => `#${issue.id} ${issue.subject}`,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.TYPE,
        value: '_embedded.type.name',
        type: IssueFieldType.TEXT,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
        value: '_embedded.status.name',
        type: IssueFieldType.TEXT,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.PRIORITY,
        value: '_embedded.priority.name',
        type: IssueFieldType.TEXT,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.AUTHOR,
        value: '_embedded.author.name',
        type: IssueFieldType.TEXT,
        isVisible: (issue: OpenProjectWorkPackage) => !!issue._embedded?.author,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
        value: '_embedded.assignee.name',
        type: IssueFieldType.TEXT,
        isVisible: (issue: OpenProjectWorkPackage) => !!issue._embedded?.assignee,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.TIME_SPENT,
        type: IssueFieldType.CUSTOM,
        customTemplate: 'open-project-spent-time',
        value: (issue: OpenProjectWorkPackage) => issue.spentTime,
        isVisible: (issue: OpenProjectWorkPackage) => issue.spentTime !== 'PT0S',
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
        value: 'description.raw',
        type: IssueFieldType.MARKDOWN,
        isVisible: (issue: OpenProjectWorkPackage) => !!issue.description?.raw,
      },
      {
        label: T.F.ISSUE.ISSUE_CONTENT.ATTACHMENTS,
        value: 'attachments',
        type: IssueFieldType.CUSTOM,
        customTemplate: 'open-project-attachments',
        isVisible: () => true,
        isFullWidth: true,
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
