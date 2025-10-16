// Necessary fields for trello configuration. Used for building the form, alongside with several essential properties.

import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';
import {
  CROSS_ORIGIN_WARNING,
  ISSUE_PROVIDER_COMMON_FORM_FIELDS,
} from '../../common-issue-form-stuff.const';
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
  ...CROSS_ORIGIN_WARNING,
  {
    key: 'apiKey',
    type: 'input',
    props: {
      label: 'Trello API key',
      description: 'Create or copy an API key from https://trello.com/app-key.',
      type: 'text',
      required: true,
    },
  },
  {
    key: 'token',
    type: 'input',
    props: {
      label: 'Trello API token',
      description:
        'Generate a token via the Trello developer tools after logging in with your account.',
      type: 'password',
      required: true,
    },
  },
  {
    key: 'boardId',
    type: 'input',
    props: {
      label: 'Trello board ID',
      description:
        'Paste the board ID (from the board URL) that should be used for search and auto-import.',
      type: 'text',
      required: true,
    },
  },
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
