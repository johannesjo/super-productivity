import { JiraWorklogExportDefaultTime } from '../jira/jira.model';
import { BaseIssueProviderCfg } from '../../issue.model';
import { OpenProjectOriginalStatus } from './open-project-api-responses';

export type OpenProjectTransitionOption =
  | 'ALWAYS_ASK'
  | 'DO_NOT'
  | OpenProjectOriginalStatus;

export interface OpenProjectTransitionConfig {
  // NOTE: keys mirror IssueLocalState type
  OPEN: OpenProjectTransitionOption;
  IN_PROGRESS: OpenProjectTransitionOption;
  DONE: OpenProjectTransitionOption;
}
export interface OpenProjectCfg extends BaseIssueProviderCfg {
  isSearchIssuesFromOpenProject: boolean;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  isShowTimeTrackingDialog: boolean;
  isShowTimeTrackingDialogForEachSubTask: boolean;
  timeTrackingDialogDefaultTime: JiraWorklogExportDefaultTime;
  filterUsername: string | null;
  host: string | null;
  projectId: string | null;
  token: string | null;
  scope: string | null;
  isTransitionIssuesEnabled: boolean;
  transitionConfig: OpenProjectTransitionConfig;
  availableTransitions: OpenProjectOriginalStatus[];
}
