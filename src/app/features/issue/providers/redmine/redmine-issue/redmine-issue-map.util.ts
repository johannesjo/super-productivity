import { IssueProviderKey, SearchResultItem } from '../../../issue.model';
import { RedmineIssue } from './redmine-issue.model';

export const mapRedmineIssueToSearchResult = (issue: RedmineIssue): SearchResultItem => {
  return {
    title: `#${issue.id} ${issue.subject}`,
    titleHighlighted: `#${issue.id} ${issue.subject}`,
    issueType: 'REDMINE' as IssueProviderKey,
    issueData: issue,
  };
};
