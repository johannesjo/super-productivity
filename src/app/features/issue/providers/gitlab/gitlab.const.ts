// TODO use as a checklist
import { GitlabCfg } from './gitlab';
import { T } from '../../../../t.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';
import { GITHUB_INITIAL_POLL_DELAY } from '../github/github.const';

export const DEFAULT_GITLAB_CFG: GitlabCfg = {
  isEnabled: false,
  project: null,
  gitlabBaseUrl: null,
  token: null,
  isSearchIssuesFromGitlab: false,
  isAutoPoll: false,
  isAutoAddToBacklog: false,
  filterUsername: null,
  scope: 'created-by-me',
  source: 'project',
  filter: null,
};

// NOTE: we need a high limit because git has low usage limits :(
export const GITLAB_MAX_CACHE_AGE = 10 * 60 * 1000;
export const GITLAB_POLL_INTERVAL = GITLAB_MAX_CACHE_AGE;
export const GITLAB_INITIAL_POLL_DELAY = GITHUB_INITIAL_POLL_DELAY + 8000;

// export const GITLAB_POLL_INTERVAL = 15 * 1000;
export const GITLAB_BASE_URL = 'https://gitlab.com/';

export const GITLAB_API_BASE_URL = `${GITLAB_BASE_URL}api/v4`;

export const GITLAB_PROJECT_REGEX = /(^[1-9][0-9]*$)|((\/|%2F|\w-?|\.-?)+$)/i;

export const GITLAB_CONFIG_FORM: LimitedFormlyFieldConfig<GitlabCfg>[] = [
  {
    key: 'project',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      required: true,
      label: T.F.GITLAB.FORM.PROJECT,
      type: 'text',
      pattern: GITLAB_PROJECT_REGEX,
    },
  },
  {
    key: 'token',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITLAB.FORM.TOKEN,
      type: 'password',
    },
    validation: {
      show: true,
    },
    expressionProperties: {
      // !! is used to get the associated boolean value of a non boolean value
      // It's not a fancy trick using model.project alone gets the required case right but won't remove it
      // if the project field is empty so this is needed for the wanted behavior
      'templateOptions.required': '!!model.project',
    },
  },
  {
    key: 'source',
    type: 'select',
    defaultValue: 'project',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      required: true,
      label: T.F.GITLAB.FORM.SOURCE,
      options: [
        { value: 'project', label: T.F.GITLAB.FORM.SOURCE_PROJECT },
        { value: 'group', label: T.F.GITLAB.FORM.SOURCE_GROUP },
        { value: 'global', label: T.F.GITLAB.FORM.SOURCE_GLOBAL },
      ],
    },
  },
  {
    key: 'scope',
    type: 'select',
    defaultValue: 'created-by-me',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      required: true,
      label: T.F.GITLAB.FORM.SCOPE,
      options: [
        { value: 'all', label: T.F.GITLAB.FORM.SCOPE_ALL },
        { value: 'created-by-me', label: T.F.GITLAB.FORM.SCOPE_CREATED },
        { value: 'assigned-to-me', label: T.F.GITLAB.FORM.SCOPE_ASSIGNED },
      ],
    },
  },
  {
    key: 'gitlabBaseUrl',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITLAB.FORM.GITLAB_BASE_URL,
      type: 'text',
      pattern:
        /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/,
    },
  },
  {
    key: 'isSearchIssuesFromGitlab',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITLAB.FORM.IS_SEARCH_ISSUES_FROM_GITLAB,
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITLAB.FORM.IS_AUTO_POLL,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITLAB.FORM.IS_AUTO_IMPORT_ISSUES,
    },
  },
  {
    key: 'filterUsername',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITLAB.FORM.FILTER_USER,
    },
  },
  {
    key: 'filter',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      type: 'text',
      label: T.F.GITLAB.FORM.FILTER,
      description: T.F.GITLAB.FORM.FILTER_DESCRIPTION,
    },
  },
];

export const GITLAB_CONFIG_FORM_SECTION: ConfigFormSection<GitlabCfg> = {
  title: 'GitLab',
  key: 'GITLAB',
  items: GITLAB_CONFIG_FORM,
  help: T.F.GITLAB.FORM_SECTION.HELP,
};
