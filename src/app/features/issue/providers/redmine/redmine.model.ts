import { BaseIssueProviderCfg } from '../../issue.model';

export interface RedmineCfg extends BaseIssueProviderCfg {
  projectId: string | null;
  host: string | null;
  api_key: string | null;
  scope: string | null;
  isAutoPoll?: boolean;
  isSearchIssuesFromRedmine?: boolean;
  isAutoAddToBacklog?: boolean;
}
