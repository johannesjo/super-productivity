import { OpenProjectWorkPackage } from './open-project-issue.model';
import { OpenProjectOriginalWorkPackage } from '../open-project-api-responses';
import { IssueProviderKey, SearchResultItem } from '../../../issue.model';

export const mapOpenProjectIssue = (
  issue: OpenProjectOriginalWorkPackage,
): OpenProjectWorkPackage => {
  return {
    ...issue,
    url: 'asd',
  };
};

export const mapOpenProjectIssueToSearchResult = (
  issue: OpenProjectWorkPackage,
): SearchResultItem => {
  return {
    title: '#' + issue.id + ' ' + issue.subject,
    issueType: 'OPEN_PROJECT' as IssueProviderKey,
    issueData: issue,
  };
};
