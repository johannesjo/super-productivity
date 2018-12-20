import { Dictionary } from '@ngrx/entity';
import { JiraIssue } from './jira/jira-issue/jira-issue.model';
import { JiraCfg } from './jira/jira';
import { GitCfg } from './git/git';
import { GitIssue } from './git/git-issue/git-issue.model';
import { JiraIssueState } from './jira/jira-issue/store/jira-issue.reducer';
import { GitIssueState } from './git/git-issue/store/git-issue.reducer';


export type IssueProviderKey = 'JIRA' | 'GIT';


export type IssueIntegrationCfg = JiraCfg | GitCfg;

export interface IssueIntegrationCfgs {
  // should be the same as key IssueProviderKey
  JIRA?: JiraCfg;
  GIT?: GitCfg;
}

export interface IssueEntityMap {
  JIRA: Dictionary<JiraIssue>;
  GIT: Dictionary<GitIssue>;
}


export interface IssueStateMap {
  JIRA: JiraIssueState;
  GIT: GitIssueState;
}


export type IssueState = JiraIssueState | GitIssueState;

export type IssueData = JiraIssue | GitIssue;

export interface SearchResultItem {
  title: string;
  issueType: IssueProviderKey;
  issueData: IssueData;
}
