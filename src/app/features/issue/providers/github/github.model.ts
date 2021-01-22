export interface GithubCfg {
  isSearchIssuesFromGithub: boolean;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  repo: string | null;
  token: string | null;
}
