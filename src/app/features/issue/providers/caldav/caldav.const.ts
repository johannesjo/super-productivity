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
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      required: true,
      label: T.F.CALDAV.FORM.CALDAV_URL,
      type: 'text',
      pattern:
        /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/,
    },
  },
  {
    key: 'resourceName',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      required: true,
      label: T.F.CALDAV.FORM.CALDAV_RESOURCE,
      type: 'text',
    },
  },
  {
    key: 'username',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      required: true,
      label: T.F.CALDAV.FORM.CALDAV_USER,
      type: 'text',
    },
  },
  {
    key: 'password',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
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
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.CALDAV.FORM.IS_SEARCH_ISSUES_FROM_CALDAV,
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.CALDAV.FORM.IS_AUTO_POLL,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.CALDAV.FORM.IS_AUTO_IMPORT_ISSUES,
    },
  },
  {
    key: 'isTransitionIssuesEnabled',
    type: 'checkbox',
    hideExpression: (model: any) => !model.isEnabled,
    templateOptions: {
      label: T.F.CALDAV.FORM.IS_TRANSITION_ISSUES_ENABLED,
    },
  },
  {
    key: 'categoryFilter',
    type: 'input',
    hideExpression: (model: any) => !model.isEnabled,
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
