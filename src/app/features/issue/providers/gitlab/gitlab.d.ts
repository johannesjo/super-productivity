import { BaseIssueProviderCfg } from '../../issue.model';

export interface GitlabCfg extends BaseIssueProviderCfg {
  isSearchIssuesFromGitlab: boolean;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  filterUsername: string | null;
  gitlabBaseUrl: string | null | undefined;
  source: string | null;
  project: string | null;
  token: string | null;
  scope: string | null;
  filter: string | null;
}
