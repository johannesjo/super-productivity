import { BaseIssueProviderCfg } from '../../issue.model';

export interface GithubCfg extends BaseIssueProviderCfg {
  filterUsername: string | null;
  repo: string | null;
  token: string | null;
  filterIssuesAssignedToMe: boolean;
}
