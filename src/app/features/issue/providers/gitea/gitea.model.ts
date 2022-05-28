import { BaseIssueProviderCfg } from '../../issue.model';

export interface GiteaCfg extends BaseIssueProviderCfg {
  repoFullname: string | null;
  host: string | null;
  token: string | null;
  scope: string | null;
  isAutoPoll: boolean;
  isSearchIssuesFromGitea: boolean;
  isAutoAddToBacklog: boolean;
}
