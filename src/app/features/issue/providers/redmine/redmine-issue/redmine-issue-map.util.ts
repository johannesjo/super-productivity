import { IssueProviderKey, SearchResultItem } from '../../../issue.model';
import { RedmineIssue } from './redmine-issue.model';
import { formatRedmineIssueSubject } from '../format-redmine-issue-subject.utils';

export const mapRedmineIssueToSearchResult = (issue: RedmineIssue): SearchResultItem => {
  return {
    title: formatRedmineIssueSubject(issue),
    titleHighlighted: formatRedmineIssueSubject(issue),
    issueType: 'REDMINE' as IssueProviderKey,
    issueData: issue,
  };
};
