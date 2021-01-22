export interface GitlabCfg {
  isSearchIssuesFromGitlab: boolean;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  gitlabBaseUrl: string | null | undefined;
  project: string | null;
  token: string | null;
}
