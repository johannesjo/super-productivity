import {
  ConfigFormConfig,
  GenericConfigFormSection,
} from '../config/global-config.model';
import {
  DEFAULT_JIRA_CFG,
  JIRA_CONFIG_FORM_SECTION,
  JIRA_ISSUE_TYPE,
} from './providers/jira/jira.const';
import { IssueProviderKey } from './issue.model';
import {
  DEFAULT_AZUREDEVOPS_CFG,
  AZUREDEVOPS_CONFIG_FORM_SECTION,
} from './providers/azuredevops/azuredevops.const';
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
import { T } from '../../t.const';
import {
  DEFAULT_GITEA_CFG,
  GITEA_CONFIG_FORM_SECTION,
} from './providers/gitea/gitea.const';
import {
  DEFAULT_REDMINE_CFG,
  REDMINE_CONFIG_FORM_SECTION,
} from './providers/redmine/redmine.const';

export const GITLAB_TYPE: IssueProviderKey = 'GITLAB';
export const GITHUB_TYPE: IssueProviderKey = 'GITHUB';
export const AZUREDEVOPS_TYPE: IssueProviderKey = 'AZUREDEVOPS';
export const JIRA_TYPE: IssueProviderKey = 'JIRA';
export const CALDAV_TYPE: IssueProviderKey = 'CALDAV';
export const OPEN_PROJECT_TYPE: IssueProviderKey = 'OPEN_PROJECT';
export const GITEA_TYPE: IssueProviderKey = 'GITEA';
export const REDMINE_TYPE: IssueProviderKey = 'REDMINE';

export const ISSUE_PROVIDER_TYPES: IssueProviderKey[] = [
  GITLAB_TYPE,
  GITHUB_TYPE,
  AZUREDEVOPS_TYPE,
  JIRA_TYPE,
  CALDAV_TYPE,
  OPEN_PROJECT_TYPE,
  GITEA_TYPE,
  REDMINE_TYPE,
];

export const ISSUE_PROVIDER_ICON_MAP = {
  [JIRA_TYPE]: 'jira',
  [GITHUB_TYPE]: 'github',
  [GITLAB_TYPE]: 'gitlab',
  [AZUREDEVOPS_TYPE]: 'azuredevops',
  [CALDAV_TYPE]: 'caldav',
  [OPEN_PROJECT_TYPE]: 'open_project',
  [GITEA_TYPE]: 'gitea',
  [REDMINE_TYPE]: 'redmine',
};

export const ISSUE_PROVIDER_HUMANIZED = {
  [JIRA_TYPE]: 'Jira',
  [GITHUB_TYPE]: 'GitHub',
  [GITLAB_TYPE]: 'GitLab',
  [AZUREDEVOPS_TYPE]: 'Azure DevOps',
  [CALDAV_TYPE]: 'CalDAV',
  [OPEN_PROJECT_TYPE]: 'OpenProject',
  [GITEA_TYPE]: 'Gitea',
  [REDMINE_TYPE]: 'Redmine',
};

export const DEFAULT_ISSUE_PROVIDER_CFGS = {
  [JIRA_TYPE]: DEFAULT_JIRA_CFG,
  [GITHUB_TYPE]: DEFAULT_GITHUB_CFG,
  [GITLAB_TYPE]: DEFAULT_GITLAB_CFG,
  [AZUREDEVOPS_TYPE]: DEFAULT_AZUREDEVOPS_CFG,
  [CALDAV_TYPE]: DEFAULT_CALDAV_CFG,
  [OPEN_PROJECT_TYPE]: DEFAULT_OPEN_PROJECT_CFG,
  [GITEA_TYPE]: DEFAULT_GITEA_CFG,
  [REDMINE_TYPE]: DEFAULT_REDMINE_CFG,
};

export const ISSUE_PROVIDER_WITH_CUSTOM_COMP = [JIRA_ISSUE_TYPE, OPEN_PROJECT_TYPE];

export const ISSUE_PROVIDER_FORM_CFGS: ConfigFormConfig = [
  GITLAB_CONFIG_FORM_SECTION as GenericConfigFormSection,
  GITHUB_CONFIG_FORM_SECTION as GenericConfigFormSection,
  AZUREDEVOPS_CONFIG_FORM_SECTION as GenericConfigFormSection,
  REDMINE_CONFIG_FORM_SECTION as GenericConfigFormSection,
  JIRA_CONFIG_FORM_SECTION as GenericConfigFormSection,
  CALDAV_CONFIG_FORM_SECTION as GenericConfigFormSection,
  OPEN_PROJECT_CONFIG_FORM_SECTION as GenericConfigFormSection,
  GITEA_CONFIG_FORM_SECTION as GenericConfigFormSection,
].map((providerCfg) => ({
  ...providerCfg,
  // NOTE we don't do this for jira as there is a custom cfg component with an enabled toggle
  ...(providerCfg.items && !ISSUE_PROVIDER_WITH_CUSTOM_COMP.includes(providerCfg.key)
    ? {
        items: [
          {
            key: 'isEnabled',
            type: 'toggle',
            templateOptions: {
              label: T.G.ENABLED,
            },
          },
          ...providerCfg.items,
        ],
      }
    : {}),
}));

const DEFAULT_ISSUE_STRS: { ISSUE_STR: string; ISSUES_STR: string } = {
  ISSUE_STR: T.F.ISSUE.DEFAULT.ISSUE_STR,
  ISSUES_STR: T.F.ISSUE.DEFAULT.ISSUES_STR,
};

export const ISSUE_STR_MAP: { [key: string]: { ISSUE_STR: string; ISSUES_STR: string } } =
  {
    [JIRA_TYPE]: DEFAULT_ISSUE_STRS,
    [GITHUB_TYPE]: DEFAULT_ISSUE_STRS,
    [GITLAB_TYPE]: DEFAULT_ISSUE_STRS,
    [AZUREDEVOPS_TYPE]: DEFAULT_ISSUE_STRS,
    [CALDAV_TYPE]: DEFAULT_ISSUE_STRS,
    [OPEN_PROJECT_TYPE]: {
      ISSUE_STR: T.F.OPEN_PROJECT.ISSUE_STRINGS.ISSUE_STR,
      ISSUES_STR: T.F.OPEN_PROJECT.ISSUE_STRINGS.ISSUES_STR,
    },
    [GITEA_TYPE]: DEFAULT_ISSUE_STRS,
    [REDMINE_TYPE]: DEFAULT_ISSUE_STRS,
  };
