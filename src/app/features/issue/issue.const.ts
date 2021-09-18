import {
  ConfigFormConfig,
  GenericConfigFormSection,
} from '../config/global-config.model';
import { DEFAULT_JIRA_CFG, JIRA_CONFIG_FORM_SECTION } from './providers/jira/jira.const';
import { IssueProviderKey } from './issue.model';
import {
  DEFAULT_GITHUB_CFG,
  GITHUB_CONFIG_FORM_SECTION,
} from './providers/github/github.const';
import {
  DEFAULT_GITLAB_CFG,
  GITLAB_CONFIG_FORM_SECTION,
} from './providers/gitlab/gitlab.const';
import {
  CALDAV_CONFIG_FORM_SECTION,
  DEFAULT_CALDAV_CFG,
} from './providers/caldav/caldav.const';
import {
  DEFAULT_OPEN_PROJECT_CFG,
  OPEN_PROJECT_CONFIG_FORM_SECTION,
} from './providers/open-project/open-project.const';

export const GITLAB_TYPE: IssueProviderKey = 'GITLAB';
export const GITHUB_TYPE: IssueProviderKey = 'GITHUB';
export const JIRA_TYPE: IssueProviderKey = 'JIRA';
export const CALDAV_TYPE: IssueProviderKey = 'CALDAV';
export const OPEN_PROJECT_TYPE: IssueProviderKey = 'OPEN_PROJECT';

// TODO screaming snake case
export const issueProviderIconMap = {
  [JIRA_TYPE]: 'jira',
  [GITHUB_TYPE]: 'github',
  [GITLAB_TYPE]: 'gitlab',
  [CALDAV_TYPE]: 'caldav',
  [OPEN_PROJECT_TYPE]: 'open_project',
};

export const ISSUE_PROVIDER_HUMANIZED = {
  [JIRA_TYPE]: 'Jira',
  [GITHUB_TYPE]: 'GitHub',
  [GITLAB_TYPE]: 'GitLab',
  [CALDAV_TYPE]: 'CalDAV',
  [OPEN_PROJECT_TYPE]: 'OpenProject',
};

export const DEFAULT_ISSUE_PROVIDER_CFGS = {
  [JIRA_TYPE]: DEFAULT_JIRA_CFG,
  [GITHUB_TYPE]: DEFAULT_GITHUB_CFG,
  [GITLAB_TYPE]: DEFAULT_GITLAB_CFG,
  [CALDAV_TYPE]: DEFAULT_CALDAV_CFG,
  [OPEN_PROJECT_TYPE]: DEFAULT_OPEN_PROJECT_CFG,
};

export const ISSUE_PROVIDER_FORM_CFGS: ConfigFormConfig = [
  GITLAB_CONFIG_FORM_SECTION as GenericConfigFormSection,
  GITHUB_CONFIG_FORM_SECTION as GenericConfigFormSection,
  JIRA_CONFIG_FORM_SECTION as GenericConfigFormSection,
  CALDAV_CONFIG_FORM_SECTION as GenericConfigFormSection,
  OPEN_PROJECT_CONFIG_FORM_SECTION as GenericConfigFormSection,
];
