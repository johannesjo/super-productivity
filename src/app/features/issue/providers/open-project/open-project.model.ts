export interface OpenProjectCfg {
  isSearchIssuesFromOpenProject: boolean;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  filterUsername: string | null;
  repo: string | null;
  token: string | null;
}
