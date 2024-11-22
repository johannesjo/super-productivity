import { BaseIssueProviderCfg } from '../../issue.model';

export interface GitlabCfg extends BaseIssueProviderCfg {
  filterUsername: string | null;
  gitlabBaseUrl: string | null | undefined;
  source: string | null;
  project: string | null;
  token: string | null;
  scope: string | null;
  filter: string | null;
  isEnableTimeTracking: boolean;
}
