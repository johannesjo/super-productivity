// TODO use as a checklist
import { OpenProjectCfg } from './open-project.model';
import { T } from '../../../../t.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';

export const DEFAULT_OPEN_PROJECT_CFG: OpenProjectCfg = {
  repo: null,
  token: null,
  isSearchIssuesFromOpenProject: false,
  isAutoPoll: false,
  isAutoAddToBacklog: false,
  filterUsername: null,
};

// NOTE: we need a high limit because git has low usage limits :(
// export const OPEN_PROJECT_POLL_INTERVAL = 10 * 60 * 1000;
// export const OPEN_PROJECT_INITIAL_POLL_DELAY = 8 * 1000;
export const OPEN_PROJECT_POLL_INTERVAL = 10 * 60 * 1000;
export const OPEN_PROJECT_INITIAL_POLL_DELAY = 8 * 1000;

// export const OPEN_PROJECT_POLL_INTERVAL = 15 * 1000;
export const OPEN_PROJECT_API_BASE_URL = 'https://api.openProject.com/';

export const OPEN_PROJECT_CONFIG_FORM: LimitedFormlyFieldConfig<OpenProjectCfg>[] = [
  {
    key: 'repo',
    type: 'input',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.REPO,
      type: 'text',
      pattern: /^.+\/.+?$/i,
    },
  },
  {
    key: 'token',
    type: 'input',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.TOKEN,
      description: T.F.OPEN_PROJECT.FORM.TOKEN_DESCRIPTION,
    },
  },
  {
    key: 'isSearchIssuesFromOpenProject',
    type: 'checkbox',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.IS_SEARCH_ISSUES_FROM_OPEN_PROJECT,
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.IS_AUTO_POLL,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.IS_AUTO_ADD_TO_BACKLOG,
    },
  },
  {
    key: 'filterUsername',
    type: 'input',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.FILTER_USER,
    },
  },
];

export const OPEN_PROJECT_CONFIG_FORM_SECTION: ConfigFormSection<OpenProjectCfg> = {
  title: 'GitHub',
  key: 'OPEN_PROJECT',
  items: OPEN_PROJECT_CONFIG_FORM,
  help: T.F.OPEN_PROJECT.FORM_SECTION.HELP,
};
