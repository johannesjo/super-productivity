// TODO use as a checklist
import { GitCfg } from './git';
import { FormlyFieldConfig } from '@ngx-formly/core';

export const DEFAULT_GIT_CFG: GitCfg = {
  repo: null,
  isSearchIssuesFromGit: false,
  isAutoPoll: false,
  isAutoAddToBacklog: false,
};

// NOTE: we need a high limit because git has low usage limits :(
export const GIT_POLL_INTERVAL = 5 * 60 * 1000;
export const GIT_INITIAL_POLL_DELAY = 10 * 1000;
// export const GIT_POLL_INTERVAL = 15 * 1000;
export const GIT_API_BASE_URL = 'https://api.github.com/';

export const GIT_CONFIG_FORM: FormlyFieldConfig[] = [
  {
    key: 'repo',
    type: 'input',
    templateOptions: {
      label: '"username/repositoryName" for the git repository you want to track',
    },
  },
  {
    key: 'isSearchIssuesFromGit',
    type: 'checkbox',
    templateOptions: {
      label: 'Show issues from git as suggestions when adding new tasks',
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    templateOptions: {
      label: 'Automatically poll imported git issues for changes',
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    templateOptions: {
      label: 'Automatically add unresolved issues from Git to backlog',
    },
  },
];
