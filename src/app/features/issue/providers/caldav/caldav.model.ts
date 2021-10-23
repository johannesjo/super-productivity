import { BaseIssueProviderCfg } from '../../issue.model';

export interface CaldavCfg extends BaseIssueProviderCfg {
  caldavUrl: string | null;
  resourceName: string | null;
  username: string | null;
  password: string | null;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  isSearchIssuesFromCaldav: boolean;
  isTransitionIssuesEnabled: boolean;
  categoryFilter: string | null;
}
