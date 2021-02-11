export interface CaldavCfg {
  caldavUrl: string | null;
  resourceName: string | null;
  username: string | null;
  password: string | null;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  isSearchIssuesFromCaldav: boolean;
  isTransitionIssuesEnabled: boolean;
}
