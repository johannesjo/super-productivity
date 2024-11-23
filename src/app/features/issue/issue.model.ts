import {
  JiraIssue,
  JiraIssueReduced,
} from './providers/jira/jira-issue/jira-issue.model';
import { JiraCfg } from './providers/jira/jira.model';
import { GithubCfg } from './providers/github/github.model';
import {
  GithubIssue,
  GithubIssueReduced,
} from './providers/github/github-issue/github-issue.model';
import { GitlabCfg } from './providers/gitlab/gitlab.model';
import { GitlabIssue } from './providers/gitlab/gitlab-issue/gitlab-issue.model';
import {
  CaldavIssue,
  CaldavIssueReduced,
} from './providers/caldav/caldav-issue/caldav-issue.model';
import { CaldavCfg } from './providers/caldav/caldav.model';
import { OpenProjectCfg } from './providers/open-project/open-project.model';
import {
  OpenProjectWorkPackage,
  OpenProjectWorkPackageReduced,
} from './providers/open-project/open-project-issue/open-project-issue.model';
import { GiteaCfg } from './providers/gitea/gitea.model';
import { GiteaIssue } from './providers/gitea/gitea-issue/gitea-issue.model';
import { RedmineCfg } from './providers/redmine/redmine.model';
import { RedmineIssue } from './providers/redmine/redmine-issue/redmine-issue.model';
import { EntityState } from '@ngrx/entity';
import { MODEL_VERSION_KEY } from '../../app.constants';

export interface BaseIssueProviderCfg {
  isEnabled: boolean;
}

export type IssueProviderKey =
  | 'JIRA'
  | 'GITHUB'
  | 'GITLAB'
  | 'CALDAV'
  | 'OPEN_PROJECT'
  | 'GITEA'
  | 'REDMINE'
  | 'CALENDAR';

export type IssueIntegrationCfg =
  | JiraCfg
  | GithubCfg
  | GitlabCfg
  | CaldavCfg
  | OpenProjectCfg
  | GiteaCfg
  | RedmineCfg;

export enum IssueLocalState {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export interface IssueIntegrationCfgs {
  // should be the same as key IssueProviderKey
  JIRA?: JiraCfg;
  GITHUB?: GithubCfg;
  GITLAB?: GitlabCfg;
  CALDAV?: CaldavCfg;
  OPEN_PROJECT?: OpenProjectCfg;
  GITEA?: GiteaCfg;
  REDMINE?: RedmineCfg;
}

export type IssueData =
  | JiraIssue
  | GithubIssue
  | GitlabIssue
  | CaldavIssue
  | OpenProjectWorkPackage
  | GiteaIssue
  | RedmineIssue;

export type IssueDataReduced =
  | GithubIssueReduced
  | JiraIssueReduced
  | GitlabIssue
  | OpenProjectWorkPackageReduced
  | CaldavIssueReduced
  | GiteaIssue
  | RedmineIssue;

export type IssueDataReducedMap = {
  [K in IssueProviderKey]: K extends 'JIRA'
    ? JiraIssueReduced
    : K extends 'GITHUB'
      ? GithubIssueReduced
      : K extends 'GITLAB'
        ? GitlabIssue
        : K extends 'CALDAV'
          ? CaldavIssueReduced
          : K extends 'OPEN_PROJECT'
            ? OpenProjectWorkPackageReduced
            : K extends 'GITEA'
              ? GiteaIssue
              : K extends 'REDMINE'
                ? RedmineIssue
                : never;
};

export interface SearchResultItem<
  T extends keyof IssueDataReducedMap = keyof IssueDataReducedMap,
> {
  title: string;
  issueType: T;
  issueData: IssueDataReducedMap[T];
  titleHighlighted?: string;
}

// ISSUE PROVIDER MODEL
// --------------------

export interface IssueProviderState extends EntityState<IssueProvider> {
  ids: string[];
  // additional entities state properties
  [MODEL_VERSION_KEY]: number;
}

// export type IssueProviderState = EntityState<IssueProvider>;

export interface IssueProviderBase {
  id: string;
  isEnabled: boolean;
  issueProviderKey: IssueProviderKey;
  defaultProjectId: string | null;
  pinnedSearch: string | null;
  // delete at some point in the future
  migratedFromProjectId?: string;
  isAutoPoll: boolean;
  isAutoAddToBacklog: boolean;
  isIntegratedAddTaskBar: boolean;
}

export interface IssueProviderJira extends IssueProviderBase, JiraCfg {
  issueProviderKey: 'JIRA';
}

export interface IssueProviderGithub extends IssueProviderBase, GithubCfg {
  issueProviderKey: 'GITHUB';
}

export interface IssueProviderGitlab extends IssueProviderBase, GitlabCfg {
  issueProviderKey: 'GITLAB';
}

export interface IssueProviderCaldav extends IssueProviderBase, CaldavCfg {
  issueProviderKey: 'CALDAV';
}

export interface IssueProviderOpenProject extends IssueProviderBase, OpenProjectCfg {
  issueProviderKey: 'OPEN_PROJECT';
}

export interface IssueProviderGitea extends IssueProviderBase, GiteaCfg {
  issueProviderKey: 'GITEA';
}

export interface IssueProviderRedmine extends IssueProviderBase, RedmineCfg {
  issueProviderKey: 'REDMINE';
}

export type IssueProvider =
  | IssueProviderJira
  | IssueProviderGithub
  | IssueProviderGitlab
  | IssueProviderCaldav
  | IssueProviderOpenProject
  | IssueProviderGitea
  | IssueProviderRedmine;

export type IssueProviderTypeMap<T extends IssueProviderKey> = T extends 'JIRA'
  ? IssueProviderJira
  : T extends 'GITHUB'
    ? IssueProviderGithub
    : T extends 'GITLAB'
      ? IssueProviderGitlab
      : T extends 'GITEA'
        ? IssueProviderGitea
        : T extends 'OPEN_PROJECT'
          ? IssueProviderOpenProject
          : T extends 'REDMINE'
            ? IssueProviderRedmine
            : T extends 'CALDAV'
              ? IssueProviderCaldav
              : never;
