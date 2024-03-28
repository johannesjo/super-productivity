import { BaseIssueProviderCfg } from '../../issue.model';

export interface AzuredevopsCfg extends BaseIssueProviderCfg {
  isSearchIssuesFromAzuredevops: boolean;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  filterUsername: string | null;
  organization: string | null;
  project: string | null;
  token: string | null;
}
