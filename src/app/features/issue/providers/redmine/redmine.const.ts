import { RedmineCfg } from './redmine.model';

export const REDMINE_POLL_INTERVAL = 5 * 60 * 1000;
export const REDMINE_INITIAL_POLL_DELAY = 8 * 1000;

export const DEFAULT_REDMINE_CFG: RedmineCfg = {
  isEnabled: false,
  projectId: null,
  host: null,
  api_key: null,
  scope: 'assigned-to-me',
  isAutoPoll: false,
  isSearchIssuesFromRedmine: false,
  isAutoAddToBacklog: false,
};
