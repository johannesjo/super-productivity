import { CaldavCfg } from './caldav.model';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';
import { T } from '../../../../t.const';

export const DEFAULT_CALDAV_CFG: CaldavCfg = {
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

export const CALDAV_CONFIG_FORM: LimitedFormlyFieldConfig<CaldavCfg>[] = [
  {
    key: 'caldavUrl',
    type: 'input',
    templateOptions: {
      label: T.F.CALDAV.FORM.CALDAV_URL,
      type: 'text',
      pattern:
        /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/,
    },
  },
  {
    key: 'resourceName',
    type: 'input',
    templateOptions: {
      label: T.F.CALDAV.FORM.CALDAV_RESOURCE,
      type: 'text',
    },
  },
  {
    key: 'username',
    type: 'input',
    templateOptions: {
      label: T.F.CALDAV.FORM.CALDAV_USER,
      type: 'text',
    },
  },
  {
    key: 'password',
    type: 'input',
    templateOptions: {
      type: 'password',
      label: T.F.CALDAV.FORM.CALDAV_PASSWORD,
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
      label: T.F.CALDAV.FORM.IS_AUTO_ADD_TO_BACKLOG,
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

export const CALDAV_CONFIG_FORM_SECTION: ConfigFormSection<CaldavCfg> = {
  title: 'CalDav',
  key: 'CALDAV',
  items: CALDAV_CONFIG_FORM,
  help: T.F.CALDAV.FORM_SECTION.HELP,
};
