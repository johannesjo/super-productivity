import { BaseIssueProviderCfg } from '../../issue.model';

export interface CaldavCfg extends BaseIssueProviderCfg {
  caldavUrl: string | null;
  resourceName: string | null;
  username: string | null;
  password: string | null;
  isTransitionIssuesEnabled: boolean;
  categoryFilter: string | null;
}
