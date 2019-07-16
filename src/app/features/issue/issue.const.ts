import {ConfigFormConfig} from '../config/global-config.model';
import {
  DEFAULT_JIRA_CFG,
  JIRA_ADVANCED_FORM_CFG,
  JIRA_CONFIG_FORM_SECTION,
  JIRA_CREDENTIALS_FORM_CFG
} from './jira/jira.const';
import {IssueProviderKey} from './issue';
import {DEFAULT_GITHUB_CFG, GITHUB_CONFIG_FORM, GITHUB_CONFIG_FORM_SECTION} from './github/github.const';
import {T} from '../../t.const';

export const LEGACY_GITHUB_TYPE = 'GIT';

export const GITHUB_TYPE: IssueProviderKey = 'GITHUB';
export const JIRA_TYPE: IssueProviderKey = 'JIRA';

export const issueProviderKeys: IssueProviderKey[] = [JIRA_TYPE, GITHUB_TYPE];


export const issueProviderIconMap = {
  [JIRA_TYPE]: 'jira',
  [GITHUB_TYPE]: 'github'
};

export const DEFAULT_ISSUE_PROVIDER_CFGS = {
  [JIRA_TYPE]: DEFAULT_JIRA_CFG,
  [GITHUB_TYPE]: DEFAULT_GITHUB_CFG,
};

export const ISSUE_PROVIDER_FORM_CFGS: ConfigFormConfig = [
  GITHUB_CONFIG_FORM_SECTION,
  JIRA_CONFIG_FORM_SECTION,
];
