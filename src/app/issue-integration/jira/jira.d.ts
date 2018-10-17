import { IssueIntegrationCfg } from '../issue-integration';

export type JiraTransitionOption = 'ALWAYS_ASK' | 'DO_NOT' | string;

export interface JiraTransitionOptions {
  OPEN: JiraTransitionOption;
  IN_PROGRESS: JiraTransitionOption;
  DONE: JiraTransitionOption;
}

export interface JiraCfg extends IssueIntegrationCfg {
  isAutoPollTickets: boolean;
  searchJqlQuery: string;

  isAutoAddToBacklog: boolean;
  autoAddBacklogJqlQuery: string;

  isWorklogEnabled: boolean;
  isAutoWorklog: boolean;
  isAddWorklogOnSubTaskDone: boolean;

  isUpdateIssueFromLocal: boolean;

  isShowComponents: boolean;

  isCheckToReAssignTicketOnTaskStart: boolean;
  userAssigneeName: string;

  isTransitionIssuesEnabled: boolean;
  availableTransitions: JiraTransitionOptions;
  userToAssignOnDone: string;
}

