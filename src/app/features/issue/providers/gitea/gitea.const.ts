import { GiteaCfg } from './gitea.model';

export const GITEA_POLL_INTERVAL = 5 * 60 * 1000;
export const GITEA_INITIAL_POLL_DELAY = 8 * 1000;

export const DEFAULT_GITEA_CFG: GiteaCfg = {
  isEnabled: false,
  host: null,
  projectId: null,
  token: null,
  isAutoPoll: false,
  isSearchIssuesFromGitea: false,
  isAutoAddToBacklog: false,
  scope: 'created-by-me',
};
