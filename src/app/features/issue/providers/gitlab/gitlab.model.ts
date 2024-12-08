import { BaseIssueProviderCfg } from '../../issue.model';

export interface GitlabCfg extends BaseIssueProviderCfg {
  project: string;
  filterUsername: string | null;
  gitlabBaseUrl: string | null | undefined;
  source: string | null;
  token: string | null;
  scope: string | null;
  filter: string | null;
  isEnableTimeTracking: boolean;
}
