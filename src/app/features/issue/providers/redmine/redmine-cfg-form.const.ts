import { T } from '../../../../t.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';
import { IssueProviderRedmine } from '../../issue.model';
import { ISSUE_PROVIDER_COMMON_FORM_FIELDS } from '../../common-issue-form-stuff.const';
import { RedmineCfg } from './redmine.model';

export enum ScopeOptions {
  all = 'all',
  createdByMe = 'created-by-me',
  assignedToMe = 'assigned-to-me',
}

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

export const REDMINE_CONFIG_FORM: LimitedFormlyFieldConfig<IssueProviderRedmine>[] = [
  {
    key: 'host',
    type: 'input',

    templateOptions: {
      label: T.F.REDMINE.FORM.HOST,
      type: 'url',
      pattern: /^.+\/.+?$/i,
      required: true,
    },
  },
  {
    key: 'api_key',
    type: 'input',

    templateOptions: {
      label: T.F.REDMINE.FORM.API_KEY,
      required: true,
      type: 'password',
    },
  },
  {
    key: 'projectId',
    type: 'input',

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

    templateOptions: {
      required: true,
      label: T.F.REDMINE.FORM.SCOPE,
      options: [
        { value: ScopeOptions.all, label: T.F.REDMINE.FORM.SCOPE_ALL },
        { value: ScopeOptions.createdByMe, label: T.F.REDMINE.FORM.SCOPE_CREATED },
        { value: ScopeOptions.assignedToMe, label: T.F.REDMINE.FORM.SCOPE_ASSIGNED },
      ],
    },
  },
  {
    type: 'collapsible',
    // todo translate
    props: { label: 'Advanced Config' },
    fieldGroup: [...ISSUE_PROVIDER_COMMON_FORM_FIELDS],
  },
];

export const REDMINE_CONFIG_FORM_SECTION: ConfigFormSection<IssueProviderRedmine> = {
  title: T.F.REDMINE.FORM_SECTION.TITLE,
  key: 'REDMINE',
  items: REDMINE_CONFIG_FORM,
  help: T.F.REDMINE.FORM_SECTION.HELP,
};
