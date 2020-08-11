import { ConfigFormConfig, GenericConfigFormSection } from '../config/global-config.model';
import { DEFAULT_JIRA_CFG, JIRA_CONFIG_FORM_SECTION } from './providers/jira/jira.const';
import { IssueProviderKey } from './issue.model';
import { DEFAULT_GITHUB_CFG, GITHUB_CONFIG_FORM_SECTION } from './providers/github/github.const';
import { DEFAULT_GITLAB_CFG, GITLAB_CONFIG_FORM_SECTION } from './providers/gitlab/gitlab.const';

export const GITLAB_TYPE: IssueProviderKey = 'GITLAB';
export const GITHUB_TYPE: IssueProviderKey = 'GITHUB';
export const JIRA_TYPE: IssueProviderKey = 'JIRA';

// TODO uppercase
export const issueProviderKeys: IssueProviderKey[] = [JIRA_TYPE, GITHUB_TYPE, GITLAB_TYPE];

export const issueProviderIconMap = {
  [JIRA_TYPE]: 'jira',
  [GITHUB_TYPE]: 'github',
  [GITLAB_TYPE]: 'gitlab'
};

export const DEFAULT_ISSUE_PROVIDER_CFGS = {
  [JIRA_TYPE]: DEFAULT_JIRA_CFG,
  [GITHUB_TYPE]: DEFAULT_GITHUB_CFG,
  [GITLAB_TYPE]: DEFAULT_GITLAB_CFG
};

export const ISSUE_PROVIDER_FORM_CFGS: ConfigFormConfig = [
  (GITLAB_CONFIG_FORM_SECTION as GenericConfigFormSection),
  (GITHUB_CONFIG_FORM_SECTION as GenericConfigFormSection),
  (JIRA_CONFIG_FORM_SECTION as GenericConfigFormSection),
];
