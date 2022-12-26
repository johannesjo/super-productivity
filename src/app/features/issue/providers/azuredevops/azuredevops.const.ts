// TODO use as a checklist
import { AzuredevopsCfg } from './azuredevops.model';
import { T } from '../../../../t.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';

export const DEFAULT_AZUREDEVOPS_CFG: AzuredevopsCfg = {
  isEnabled: false,
  organization: null,
  project: null,
  token: null,
  isSearchIssuesFromAzuredevops: false,
  isAutoPoll: false,
  isAutoAddToBacklog: false,
  filterUsername: null,
};

export const AZUREDEVOPS_POLL_INTERVAL = 10 * 60 * 1000;
export const AZUREDEVOPS_INITIAL_POLL_DELAY = 8 * 1000;

export const AZUREDEVOPS_API_BASE_URL = 'https://dev.azure.com';

export const AZUREDEVOPS_CONFIG_FORM: LimitedFormlyFieldConfig<AzuredevopsCfg>[] = [
  {
    key: 'project',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.AZUREDEVOPS.FORM.PROJECT,
      required: true,
      type: 'text',
    },
  },
  {
    key: 'token',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.AZUREDEVOPS.FORM.TOKEN,
      description: T.F.AZUREDEVOPS.FORM.TOKEN_DESCRIPTION,
      type: 'password',
    },
  },
  {
    key: 'isSearchIssuesFromAzuredevops',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.AZUREDEVOPS.FORM.IS_SEARCH_ISSUES_FROM_AZUREDEVOPS,
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.AZUREDEVOPS.FORM.IS_AUTO_POLL,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.AZUREDEVOPS.FORM.IS_AUTO_ADD_TO_BACKLOG,
    },
  },
  {
    key: 'organization',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.AZUREDEVOPS.FORM.ORGANIZATION,
    },
  },
  {
    key: 'filterUsername',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.AZUREDEVOPS.FORM.FILTER_USER,
    },
  },
];

export const AZUREDEVOPS_CONFIG_FORM_SECTION: ConfigFormSection<AzuredevopsCfg> = {
  title: 'AZUREDEVOPS',
  key: 'AZUREDEVOPS',
  items: AZUREDEVOPS_CONFIG_FORM,
  help: T.F.AZUREDEVOPS.FORM_SECTION.HELP,
};
