// TODO use as a checklist
import {GithubCfg} from './github';
import {FormlyFieldConfig} from '@ngx-formly/core';
import {T} from '../../../t.const';

export const DEFAULT_GITHUB_CFG: GithubCfg = {
  repo: null,
  isSearchIssuesFromGithub: false,
  isAutoPoll: false,
  isAutoAddToBacklog: false,
};

// NOTE: we need a high limit because git has low usage limits :(
export const GITHUB_MAX_CACHE_AGE = 10 * 60 * 1000;
export const GITHUB_POLL_INTERVAL = GITHUB_MAX_CACHE_AGE;
export const GITHUB_INITIAL_POLL_DELAY = 8 * 1000;

// export const GITHUB_POLL_INTERVAL = 15 * 1000;
export const GITHUB_API_BASE_URL = 'https://api.github.com/';

export const GITHUB_CONFIG_FORM: FormlyFieldConfig[] = [
  {
    key: 'repo',
    type: 'input',
    templateOptions: {
      label:  T.F.GITHUB.FORM.REPO,
      type: 'text',
      pattern: /^.+\/.+?$/i,
    },
  },
  {
    key: 'isSearchIssuesFromGithub',
    type: 'checkbox',
    templateOptions: {
      label:  T.F.GITHUB.FORM.IS_SEARCH_ISSUES_FROM_GITHUB
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    templateOptions: {
      label:  T.F.GITHUB.FORM.IS_AUTO_POLL
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    templateOptions: {
      label:  T.F.GITHUB.FORM.IS_AUTO_ADD_TO_BACKLOG
    },
  },
];
