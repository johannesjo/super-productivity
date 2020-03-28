export interface GitlabCfg {
  isSearchIssuesFromGitlab: boolean;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  isCloseReopenEnabled: boolean;
  filterUsername: string;
  project: string;
  token: string;
}
