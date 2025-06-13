import { DEFAULT_JIRA_CFG, JIRA_CONFIG_FORM_SECTION } from './providers/jira/jira.const';
import { IssueProviderBase, IssueProviderKey } from './issue.model';
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
import {
  CALENDAR_FORM_CFG_NEW,
  DEFAULT_CALENDAR_CFG,
} from './providers/calendar/calendar.const';

export const DELAY_BEFORE_ISSUE_POLLING = 8000;

export const GITLAB_TYPE: IssueProviderKey = 'GITLAB';
export const GITHUB_TYPE: IssueProviderKey = 'GITHUB';
export const JIRA_TYPE: IssueProviderKey = 'JIRA';
export const CALDAV_TYPE: IssueProviderKey = 'CALDAV';
export const OPEN_PROJECT_TYPE: IssueProviderKey = 'OPEN_PROJECT';
export const GITEA_TYPE: IssueProviderKey = 'GITEA';
export const REDMINE_TYPE: IssueProviderKey = 'REDMINE';
export const ICAL_TYPE: IssueProviderKey = 'ICAL';

export const ISSUE_PROVIDER_TYPES: IssueProviderKey[] = [
  GITLAB_TYPE,
  GITHUB_TYPE,
  JIRA_TYPE,
  CALDAV_TYPE,
  ICAL_TYPE,
  OPEN_PROJECT_TYPE,
  GITEA_TYPE,
  REDMINE_TYPE,
] as const;

export const ISSUE_PROVIDER_ICON_MAP = {
  [JIRA_TYPE]: 'jira',
  [GITHUB_TYPE]: 'github',
  [GITLAB_TYPE]: 'gitlab',
  [CALDAV_TYPE]: 'caldav',
  [ICAL_TYPE]: 'calendar',
  [OPEN_PROJECT_TYPE]: 'open_project',
  [GITEA_TYPE]: 'gitea',
  [REDMINE_TYPE]: 'redmine',
} as const;

export const ISSUE_PROVIDER_HUMANIZED = {
  [JIRA_TYPE]: 'Jira',
  [GITHUB_TYPE]: 'GitHub',
  [GITLAB_TYPE]: 'GitLab',
  [CALDAV_TYPE]: 'CalDAV',
  [ICAL_TYPE]: 'Calendar',
  [OPEN_PROJECT_TYPE]: 'OpenProject',
  [GITEA_TYPE]: 'Gitea',
  [REDMINE_TYPE]: 'Redmine',
} as const;

export const DEFAULT_ISSUE_PROVIDER_CFGS = {
  [JIRA_TYPE]: DEFAULT_JIRA_CFG,
  [GITHUB_TYPE]: DEFAULT_GITHUB_CFG,
  [GITLAB_TYPE]: DEFAULT_GITLAB_CFG,
  [CALDAV_TYPE]: DEFAULT_CALDAV_CFG,
  [ICAL_TYPE]: DEFAULT_CALENDAR_CFG,
  [OPEN_PROJECT_TYPE]: DEFAULT_OPEN_PROJECT_CFG,
  [GITEA_TYPE]: DEFAULT_GITEA_CFG,
  [REDMINE_TYPE]: DEFAULT_REDMINE_CFG,
} as const;

export const ISSUE_PROVIDER_FORM_CFGS_MAP = {
  [JIRA_TYPE]: JIRA_CONFIG_FORM_SECTION,
  [GITHUB_TYPE]: GITHUB_CONFIG_FORM_SECTION,
  [GITLAB_TYPE]: GITLAB_CONFIG_FORM_SECTION,
  [CALDAV_TYPE]: CALDAV_CONFIG_FORM_SECTION,
  [ICAL_TYPE]: CALENDAR_FORM_CFG_NEW as any,
  [OPEN_PROJECT_TYPE]: OPEN_PROJECT_CONFIG_FORM_SECTION,
  [GITEA_TYPE]: GITEA_CONFIG_FORM_SECTION,
  [REDMINE_TYPE]: REDMINE_CONFIG_FORM_SECTION,
} as const;

const DEFAULT_ISSUE_STRS: { ISSUE_STR: string; ISSUES_STR: string } = {
  ISSUE_STR: T.F.ISSUE.DEFAULT.ISSUE_STR,
  ISSUES_STR: T.F.ISSUE.DEFAULT.ISSUES_STR,
} as const;

export const ISSUE_STR_MAP: { [key: string]: { ISSUE_STR: string; ISSUES_STR: string } } =
  {
    [JIRA_TYPE]: DEFAULT_ISSUE_STRS,
    [GITHUB_TYPE]: DEFAULT_ISSUE_STRS,
    [GITLAB_TYPE]: DEFAULT_ISSUE_STRS,
    [CALDAV_TYPE]: DEFAULT_ISSUE_STRS,
    // TODO correct value and add translation
    [ICAL_TYPE]: {
      ISSUE_STR: T.F.OPEN_PROJECT.ISSUE_STRINGS.ISSUE_STR,
      ISSUES_STR: T.F.OPEN_PROJECT.ISSUE_STRINGS.ISSUES_STR,
    },
    [OPEN_PROJECT_TYPE]: {
      ISSUE_STR: T.F.OPEN_PROJECT.ISSUE_STRINGS.ISSUE_STR,
      ISSUES_STR: T.F.OPEN_PROJECT.ISSUE_STRINGS.ISSUES_STR,
    },
    [GITEA_TYPE]: DEFAULT_ISSUE_STRS,
    [REDMINE_TYPE]: DEFAULT_ISSUE_STRS,
  } as const;

export const ISSUE_PROVIDER_DEFAULT_COMMON_CFG: Omit<
  IssueProviderBase,
  'id' | 'issueProviderKey' | 'isEnabled'
> = {
  isAutoPoll: true,
  isAutoAddToBacklog: false,
  isIntegratedAddTaskBar: false,
  defaultProjectId: null,
  pinnedSearch: null,
} as const;
