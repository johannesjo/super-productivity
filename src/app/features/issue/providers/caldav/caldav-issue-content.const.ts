import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';
import { IssueProviderKey } from '../../issue.model';

export const CALDAV_ISSUE_CONTENT_CONFIG: IssueContentConfig = {
  issueType: 'CALDAV' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      field: 'summary',
      type: IssueFieldType.TEXT,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
      field: 'description',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue.description,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.LOCATION,
      field: 'location',
      type: IssueFieldType.TEXT,
      isVisible: (issue) => !!issue.location,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.START,
      field: 'start',
      type: IssueFieldType.TEXT,
    },
  ],
};
