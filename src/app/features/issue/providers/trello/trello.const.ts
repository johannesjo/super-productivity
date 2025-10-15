import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';
import { ISSUE_PROVIDER_COMMON_FORM_FIELDS } from '../../common-issue-form-stuff.const';
import { IssueProviderTrello } from '../../issue.model';
import { TrelloCfg } from './trello.model';

export const DEFAULT_TRELLO_CFG: TrelloCfg = {
  isEnabled: false,
  token: null,
  boardId: null,
};

export const TRELLO_POLL_INTERVAL = 5 * 60 * 1000;
export const TRELLO_CONFIG_FORM: LimitedFormlyFieldConfig<IssueProviderTrello>[] = [
  {
    key: 'boardId',
    type: 'input',
    props: {
      label: 'Trello board ID',
      description: 'Specify the board to sync when the integration becomes available.',
      type: 'text',
    },
  },
  {
    key: 'token',
    type: 'input',
    props: {
      label: 'Trello API token',
      description:
        'Generate a token via Trello developer tools. This stub does not use it yet.',
      type: 'password',
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
  help: 'Trello integration is currently a non-functional stub.',
};
