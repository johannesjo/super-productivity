import {
  OpenProjectWorkPackage,
  OpenProjectWorkPackageReduced,
} from './open-project-issue.model';
import {
  OpenProjectOriginalWorkPackageFull,
  OpenProjectOriginalWorkPackageReduced,
} from '../open-project-api-responses';
import { SearchResultItem } from '../../../issue.model';
import { OpenProjectCfg } from '../open-project.model';
import { OPEN_PROJECT_TYPE } from '../../../issue.const';

export const mapOpenProjectIssueReduced = (
  issue: OpenProjectOriginalWorkPackageReduced,
  cfg: OpenProjectCfg,
): OpenProjectWorkPackageReduced => {
  return {
    ...issue,
    url: `${cfg.host}/projects/${cfg.projectId}/work_packages/${issue.id}`,
  };
};

export const mapOpenProjectIssueFull = (
  issue: OpenProjectOriginalWorkPackageFull,
  cfg: OpenProjectCfg,
): OpenProjectWorkPackage => {
  return mapOpenProjectIssueReduced(
    issue as OpenProjectOriginalWorkPackageReduced,
    cfg,
  ) as OpenProjectWorkPackage;
};

export const mapOpenProjectIssueToSearchResult = (
  issue: OpenProjectWorkPackage,
): SearchResultItem => {
  return {
    title: '#' + issue.id + ' ' + issue.subject,
    issueType: OPEN_PROJECT_TYPE,
    issueData: issue,
  };
};
