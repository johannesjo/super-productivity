import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from 'src/app/features/config/global-config.model';
import { T } from 'src/app/t.const';
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

export const GITEA_CONFIG_FORM: LimitedFormlyFieldConfig<GiteaCfg>[] = [
  {
    key: 'host',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITEA.FORM.HOST,
      type: 'text',
      pattern: /^.+\/.+?$/i,
      required: true,
    },
  },
  {
    key: 'token',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITEA.FORM.TOKEN,
      required: true,
      type: 'password',
    },
  },
  {
    key: 'projectId',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITEA.FORM.PROJECT_ID,
      type: 'text',
      required: true,
      description: T.F.GITEA.FORM.PROJECT_ID_DESCRIPTION,
    },
  },
  {
    key: 'scope',
    type: 'select',
    defaultValue: 'created-by-me',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      required: true,
      label: T.F.GITEA.FORM.SCOPE,
      options: [
        { value: 'all', label: T.F.OPEN_PROJECT.FORM.SCOPE_ALL },
        { value: 'created-by-me', label: T.F.OPEN_PROJECT.FORM.SCOPE_CREATED },
        { value: 'assigned-to-me', label: T.F.OPEN_PROJECT.FORM.SCOPE_ASSIGNED },
      ],
    },
  },
  {
    key: 'isSearchIssuesFromGitea',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITEA.FORM.IS_SEARCH_ISSUES_FROM_GITEA,
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITEA.FORM.IS_AUTO_POLL,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.GITEA.FORM.IS_AUTO_ADD_TO_BACKLOG,
    },
  },
];

export const GITEA_CONFIG_FORM_SECTION: ConfigFormSection<GiteaCfg> = {
  title: 'Open Project',
  key: 'GITEA',
  items: GITEA_CONFIG_FORM,
  help: T.F.GITEA.FORM_SECTION.HELP,
};
