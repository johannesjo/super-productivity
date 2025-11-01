// Necessary fields for trello configuration. Used for building the form, alongside with several essential properties.

import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';
import { ISSUE_PROVIDER_COMMON_FORM_FIELDS } from '../../common-issue-form-stuff.const';
import { IssueProviderTrello } from '../../issue.model';
import { TrelloCfg } from './trello.model';

export const DEFAULT_TRELLO_CFG: TrelloCfg = {
  isEnabled: false,
  apiKey: null,
  token: null,
  boardId: null,
};

export const TRELLO_POLL_INTERVAL = 5 * 60 * 1000;
export const TRELLO_CONFIG_FORM: LimitedFormlyFieldConfig<IssueProviderTrello>[] = [
  // ...CROSS_ORIGIN_WARNING,
  // TODO: add instruction for https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/
  {
    key: 'apiKey',
    type: 'input',
    props: {
      label: 'Trello API key',
      description: 'Insert the Trello API key here',
      type: 'text',
      required: true,
    },
  },
  {
    key: 'token',
    type: 'input',
    props: {
      label: 'Trello API token',
      description: 'Insert the Trello API token here.',
      type: 'password',
      required: true,
    },
  },
  // search boards
  {
    type: 'collapsible',
    props: { label: 'Advanced Config' },
    fieldGroup: [...ISSUE_PROVIDER_COMMON_FORM_FIELDS],
  },
];

export const TRELLO_CONFIG_FORM_SECTION: ConfigFormSection<IssueProviderTrello> = {
  title: 'Trello',
  key: 'TRELLO',
  items: TRELLO_CONFIG_FORM,
  help: 'Connect your Trello board to search for cards, open them from tasks, and keep card details in sync.',
};
