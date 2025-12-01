import { BaseIssueProviderCfg } from '../../issue.model';

export interface GithubCfg extends BaseIssueProviderCfg {
  repo: string | null;
  token: string | null;
  filterUsernameForIssueUpdates?: string | null;
  backlogQuery?: string;
}
