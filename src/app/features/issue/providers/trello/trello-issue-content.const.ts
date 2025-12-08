/**
 * Content of issues imported from trello.
 * Useful for display in the issue panel.
 */

import { T } from '../../../../t.const';
import {
  IssueContentConfig,
  IssueFieldType,
} from '../../issue-content/issue-content.model';
import { IssueProviderKey } from '../../issue.model';
import { TrelloIssue } from './trello-issue.model';

const formatMembers = (issue: TrelloIssue): string =>
  issue.members
    .map((member) => member.fullName || member.username)
    .filter(Boolean)
    .join(', ');

export const TRELLO_ISSUE_CONTENT_CONFIG: IssueContentConfig<TrelloIssue> = {
  issueType: 'TRELLO' as IssueProviderKey,
  fields: [
    {
      label: T.F.ISSUE.ISSUE_CONTENT.SUMMARY,
      type: IssueFieldType.LINK,
      value: (issue: TrelloIssue) => `${issue.key} ${issue.summary}`.trim(),
      getLink: (issue: TrelloIssue) => issue.url,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.STATUS,
      type: IssueFieldType.TEXT,
      value: (issue: TrelloIssue) => (issue.closed ? 'Closed' : 'Open'),
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DUE_DATE,
      type: IssueFieldType.TEXT,
      value: (issue: TrelloIssue) => issue.due,
      isVisible: (issue: TrelloIssue) => !!issue.due,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.LABELS,
      type: IssueFieldType.CHIPS,
      value: (issue: TrelloIssue) => issue.labels,
      isVisible: (issue: TrelloIssue) => (issue.labels?.length ?? 0) > 0,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.ASSIGNEE,
      type: IssueFieldType.TEXT,
      value: (issue: TrelloIssue) => formatMembers(issue),
      isVisible: (issue: TrelloIssue) => (issue.members?.length ?? 0) > 0,
    },
    {
      label: T.F.ISSUE.ISSUE_CONTENT.DESCRIPTION,
      type: IssueFieldType.MARKDOWN,
      value: (issue: TrelloIssue) => issue.desc,
      isVisible: (issue: TrelloIssue) => !!issue.desc,
    },
  ],
  getIssueUrl: (issue: TrelloIssue) => issue.url,
};
