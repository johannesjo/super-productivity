import { IssueProviderKey, SearchResultItem } from '../../../issue.model';
import { GiteaCfg } from '../gitea.model';
import { GiteaIssue } from './gitea-issue.model';

export const mapGiteaIssueToSearchResult = (issue: GiteaIssue): SearchResultItem => {
  return {
    title: `#${issue.id} ${issue.title}`,
    titleHighlighted: `#${issue.id} ${issue.title}`,
    issueType: 'GITEA' as IssueProviderKey,
    issueData: issue,
  };
};

// We need to filter as api does not do it for us
export const isIssueFromProject = (issue: GiteaIssue, cfg: GiteaCfg): boolean => {
  if (!issue.repository) {
    return false;
  }
  // TODO fix this later
  return issue.repository.full_name === 'hugaleno/first_project';
};
