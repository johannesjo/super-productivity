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
import { GitlabCfg } from './providers/gitlab/gitlab';
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
  | 'REDMINE';

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

export interface SearchResultItem {
  title: string;
  issueType: IssueProviderKey;
  issueData: IssueDataReduced;
  titleHighlighted?: string;
}
