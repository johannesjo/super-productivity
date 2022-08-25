import {
  IssueDataReduced,
  IssueProviderKey,
  SearchResultItem,
} from '../../../issue.model';
import { RedmineIssue, RedmineSearchResultItem } from './redmine-issue.model';
import { formatRedmineIssueSubject } from '../format-redmine-issue-subject.utils';

export const mapRedmineSearchResultItemToSearchResult = (
  item: RedmineSearchResultItem,
): SearchResultItem => {
  return {
    title: item.title,
    titleHighlighted: item.title,
    issueType: 'REDMINE' as IssueProviderKey,
    issueData: item as IssueDataReduced,
  };
};

export const mapRedmineIssueToSearchResult = (issue: RedmineIssue): SearchResultItem => {
  return {
    title: formatRedmineIssueSubject(issue),
    titleHighlighted: formatRedmineIssueSubject(issue),
    issueType: 'REDMINE' as IssueProviderKey,
    issueData: issue,
  };
};
