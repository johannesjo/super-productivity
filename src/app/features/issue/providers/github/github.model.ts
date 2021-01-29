export interface GithubCfg {
  isSearchIssuesFromGithub: boolean;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  filterUsername: string | null;
  repo: string | null;
  token: string | null;
}
