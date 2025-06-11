import { IssueDataReduced, IssueProviderKey, SearchResultItem } from '../../issue.model';
import { RedmineSearchResultItem } from './redmine-issue.model';

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
