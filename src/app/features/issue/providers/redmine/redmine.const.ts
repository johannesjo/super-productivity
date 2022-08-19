import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from 'src/app/features/config/global-config.model';
import { T } from 'src/app/t.const';
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

export const REDMINE_CONFIG_FORM: LimitedFormlyFieldConfig<RedmineCfg>[] = [
  {
    key: 'host',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.REDMINE.FORM.HOST,
      type: 'text',
      pattern: /^.+\/.+?$/i,
      required: true,
    },
  },
  {
    key: 'api_key',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.REDMINE.FORM.API_KEY,
      required: true,
      type: 'password',
    },
  },
  {
    key: 'projectId',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.REDMINE.FORM.PROJECT_ID,
      type: 'text',
      required: true,
      description: T.F.REDMINE.FORM.PROJECT_ID_DESCRIPTION,
    },
  },
  {
    key: 'scope',
    type: 'select',
    defaultValue: 'assigned-to-me',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      required: true,
      label: T.F.REDMINE.FORM.SCOPE,
      options: [
        { value: 'all', label: T.F.OPEN_PROJECT.FORM.SCOPE_ALL },
        { value: 'created-by-me', label: T.F.OPEN_PROJECT.FORM.SCOPE_CREATED },
        { value: 'assigned-to-me', label: T.F.OPEN_PROJECT.FORM.SCOPE_ASSIGNED },
      ],
    },
  },
  {
    key: 'isSearchIssuesFromRedmine',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.REDMINE.FORM.IS_SEARCH_ISSUES_FROM_REDMINE,
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.REDMINE.FORM.IS_AUTO_POLL,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.REDMINE.FORM.IS_AUTO_ADD_TO_BACKLOG,
    },
  },
];

export const REDMINE_CONFIG_FORM_SECTION: ConfigFormSection<RedmineCfg> = {
  title: T.F.REDMINE.FORM_SECTION.TITLE,
  key: 'REDMINE',
  items: REDMINE_CONFIG_FORM,
  help: T.F.REDMINE.FORM_SECTION.HELP,
};
