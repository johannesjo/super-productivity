import { GiteaCfg } from './gitea.model';
import { IssueProviderGitea } from '../../issue.model';
import { ISSUE_PROVIDER_COMMON_FORM_FIELDS } from '../../common-issue-form-stuff.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';
import { T } from '../../../../t.const';

export const GITEA_POLL_INTERVAL = 5 * 60 * 1000;
export const GITEA_INITIAL_POLL_DELAY = 8 * 1000;

export const DEFAULT_GITEA_CFG: GiteaCfg = {
  isEnabled: false,
  host: null,
  repoFullname: null,
  token: null,
  scope: 'created-by-me',
};

export enum ScopeOptions {
  all = 'all',
  createdByMe = 'created-by-me',
  assignedToMe = 'assigned-to-me',
}

export const GITEA_CONFIG_FORM: LimitedFormlyFieldConfig<IssueProviderGitea>[] = [
  {
    key: 'host',
    type: 'input',
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
    templateOptions: {
      label: T.F.GITEA.FORM.TOKEN,
      required: true,
      type: 'password',
    },
  },
  {
    type: 'link',
    templateOptions: {
      url: 'https://www.jetbrains.com/help/youtrack/cloud/integration-with-gitea.html#enable-youtrack-integration-gitea',
      txt: T.F.ISSUE.HOW_TO_GET_A_TOKEN,
    },
  },
  {
    key: 'repoFullname',
    type: 'input',
    templateOptions: {
      label: T.F.GITEA.FORM.REPO_FULL_NAME,
      type: 'text',
      required: true,
      description: T.F.GITEA.FORM.REPO_FULL_NAME_DESCRIPTION,
    },
  },
  {
    key: 'scope',
    type: 'select',
    defaultValue: 'created-by-me',
    templateOptions: {
      required: true,
      label: T.F.GITEA.FORM.SCOPE,
      options: [
        { value: ScopeOptions.all, label: T.F.GITEA.FORM.SCOPE_ALL },
        { value: ScopeOptions.createdByMe, label: T.F.GITEA.FORM.SCOPE_CREATED },
        { value: ScopeOptions.assignedToMe, label: T.F.GITEA.FORM.SCOPE_ASSIGNED },
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

export const GITEA_CONFIG_FORM_SECTION: ConfigFormSection<IssueProviderGitea> = {
  title: 'Gitea',
  key: 'GITEA',
  items: GITEA_CONFIG_FORM,
  help: T.F.GITEA.FORM_SECTION.HELP,
};

export const GITEA_API_SUFFIX = 'api';
export const GITEA_API_VERSION = 'v1';
export const GITEA_API_SUBPATH_REPO = 'repos';
export const GITEA_API_SUBPATH_USER = 'user';
