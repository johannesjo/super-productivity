import { BaseIssueProviderCfg } from '../../issue.model';

export interface GithubCfg extends BaseIssueProviderCfg {
  isSearchIssuesFromGithub: boolean;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  filterUsername: string | null;
  repo: string | null;
  token: string | null;
  filterIssuesAssignedToMe: boolean;
  importLabelsAsTags: boolean;
}
