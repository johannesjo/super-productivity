import { IssueProviderKey, SearchResultItem } from '../../issue.model';
import { GiteaCfg } from './gitea.model';
import { GiteaIssue } from './gitea-issue.model';
import { formatGiteaIssueTitle } from './format-gitea-issue-title.util';

export const mapGiteaIssueToSearchResult = (issue: GiteaIssue): SearchResultItem => {
  return {
    title: formatGiteaIssueTitle(issue),
    titleHighlighted: formatGiteaIssueTitle(issue),
    issueType: 'GITEA' as IssueProviderKey,
    issueData: issue,
  };
};

// Gitea uses the issue number instead of issue id to track the issues
export const mapGiteaIssueIdToIssueNumber = (issue: GiteaIssue): GiteaIssue => {
  return { ...issue, id: issue.number };
};

// We need to filter as api does not do it for us
export const isIssueFromProject = (issue: GiteaIssue, cfg: GiteaCfg): boolean => {
  if (!issue.repository) {
    return false;
  }
  return issue.repository.full_name === cfg.repoFullname;
};
