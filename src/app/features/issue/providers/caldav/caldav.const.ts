import { CaldavCfg } from './caldav.model';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';
import { T } from '../../../../t.const';
import { IssueProviderCaldav } from '../../issue.model';
import {
  ISSUE_PROVIDER_FF_ADVANCED_SETTINGS_HEADER,
  ISSUE_PROVIDER_FF_DEFAULT_PROJECT,
} from '../../common-issue-form-stuff.const';

export const DEFAULT_CALDAV_CFG: CaldavCfg = {
  isEnabled: false,
  caldavUrl: null,
  resourceName: null,
  username: null,
  password: null,
  isAutoAddToBacklog: false,
  isAutoPoll: false,
  isSearchIssuesFromCaldav: false,
  isTransitionIssuesEnabled: false,
  categoryFilter: null,
};

export const CALDAV_POLL_INTERVAL = 10 * 60 * 1000;
export const CALDAV_INITIAL_POLL_DELAY = 8 * 1000;

export const CALDAV_CONFIG_FORM: LimitedFormlyFieldConfig<IssueProviderCaldav>[] = [
  // ISSUE_PROVIDER_FF_CREDENTIALS,
  {
    key: 'caldavUrl',
    type: 'input',
    templateOptions: {
      required: true,
      label: T.F.CALDAV.FORM.CALDAV_URL,
      type: 'url',
      pattern:
        /^(http(s)?:\/\/)?(localhost|[\w.\-]+(?:\.[\w\.\-]+)+)(:\d+)?(\/[^\s]*)?$/i,
    },
  },
  {
    key: 'resourceName',
    type: 'input',
    templateOptions: {
      required: true,
      label: T.F.CALDAV.FORM.CALDAV_RESOURCE,
      type: 'text',
    },
  },
  {
    key: 'username',
    type: 'input',
    templateOptions: {
      required: true,
      label: T.F.CALDAV.FORM.CALDAV_USER,
      type: 'text',
    },
  },
  {
    key: 'password',
    type: 'input',
    templateOptions: {
      required: true,
      type: 'password',
      label: T.F.CALDAV.FORM.CALDAV_PASSWORD,
    },
  },
  ISSUE_PROVIDER_FF_ADVANCED_SETTINGS_HEADER,
  ISSUE_PROVIDER_FF_DEFAULT_PROJECT,
  {
    key: 'isSearchIssuesFromCaldav',
    type: 'checkbox',
    templateOptions: {
      label: T.F.CALDAV.FORM.IS_SEARCH_ISSUES_FROM_CALDAV,
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    templateOptions: {
      label: T.F.CALDAV.FORM.IS_AUTO_POLL,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    templateOptions: {
      label: T.F.CALDAV.FORM.IS_AUTO_IMPORT_ISSUES,
    },
  },
  {
    key: 'isTransitionIssuesEnabled',
    type: 'checkbox',
    templateOptions: {
      label: T.F.CALDAV.FORM.IS_TRANSITION_ISSUES_ENABLED,
    },
  },
  {
    key: 'categoryFilter',
    type: 'input',
    templateOptions: {
      label: T.F.CALDAV.FORM.CALDAV_CATEGORY_FILTER,
      type: 'text',
    },
  },
];

export const CALDAV_CONFIG_FORM_SECTION: ConfigFormSection<IssueProviderCaldav> = {
  title: 'CalDav',
  key: 'CALDAV',
  items: CALDAV_CONFIG_FORM,
  help: T.F.CALDAV.FORM_SECTION.HELP,
};
