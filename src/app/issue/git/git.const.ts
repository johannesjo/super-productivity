// TODO use as a checklist
import { GitCfg } from './git';
import { FormlyFieldConfig } from '@ngx-formly/core';

export const DEFAULT_GIT_CFG: GitCfg = {
  repo: null,
  isShowIssuesFromGit: false,
  isAutoPoll: false,
  isAutoAddToBacklog: false,
};

export const GIT_POLL_INTERVAL = 5 * 60 * 1000;
export const GIT_API_BASE_URL = 'https://api.github.com/';

export const GIT_CONFIG_FORM: FormlyFieldConfig[] = [
  {
    key: 'repo',
    type: 'input',
    templateOptions: {
      label: 'Url to git repository you want to track',
    },
  },
  {
    key: 'isShowIssuesFromGit',
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
