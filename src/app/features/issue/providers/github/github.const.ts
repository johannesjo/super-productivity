// TODO use as a checklist
import { GithubCfg } from './github.model';
import { T } from '../../../../t.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';

export const DEFAULT_GITHUB_CFG: GithubCfg = {
  isEnabled: false,
  repo: null,
  token: null,
  isSearchIssuesFromGithub: false,
  isAutoPoll: false,
  isAutoAddToBacklog: false,
  filterUsername: null,
  filterIssuesAssignedToMe: false,
};

// NOTE: we need a high limit because git has low usage limits :(
// export const GITHUB_POLL_INTERVAL = 10 * 60 * 1000;
// export const GITHUB_INITIAL_POLL_DELAY = 8 * 1000;
export const GITHUB_POLL_INTERVAL = 10 * 60 * 1000;
export const GITHUB_INITIAL_POLL_DELAY = 8 * 1000;

// export const GITHUB_POLL_INTERVAL = 15 * 1000;
export const GITHUB_API_BASE_URL = 'https://api.github.com/';

export const GITHUB_CONFIG_FORM: LimitedFormlyFieldConfig<GithubCfg>[] = [
  {
    key: 'repo',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITHUB.FORM.REPO,
      required: true,
      type: 'text',
      pattern: /^.+\/.+?$/i,
    },
  },
  {
    key: 'token',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITHUB.FORM.TOKEN,
      description: T.F.GITHUB.FORM.TOKEN_DESCRIPTION,
      type: 'password',
    },
  },
  {
    key: 'isSearchIssuesFromGithub',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITHUB.FORM.IS_SEARCH_ISSUES_FROM_GITHUB,
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITHUB.FORM.IS_AUTO_POLL,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITHUB.FORM.IS_AUTO_ADD_TO_BACKLOG,
    },
  },
  {
    key: 'filterUsername',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITHUB.FORM.FILTER_USER,
    },
  },
  {
    key: 'filterIssuesAssignedToMe',
    type: 'checkbox',
    templateOptions: {
      label: T.F.GITHUB.FORM.FILTER_ASSIGNED,
    },
  },
];

export const GITHUB_CONFIG_FORM_SECTION: ConfigFormSection<GithubCfg> = {
  title: 'GitHub',
  key: 'GITHUB',
  items: GITHUB_CONFIG_FORM,
  help: T.F.GITHUB.FORM_SECTION.HELP,
};
