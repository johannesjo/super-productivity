import { OpenProjectWorkPackage } from './open-project-issue.model';
import { OpenProjectOriginalWorkPackage } from '../open-project-api-responses';
import { IssueProviderKey, SearchResultItem } from '../../../issue.model';
import { OpenProjectCfg } from '../open-project.model';

export const mapOpenProjectIssue = (
  issue: OpenProjectOriginalWorkPackage,
  cfg: OpenProjectCfg,
): OpenProjectWorkPackage => {
  return {
    ...issue,
    url: `${cfg.host}/projects/${cfg.projectId}/work_packages/${issue.id}`,
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
