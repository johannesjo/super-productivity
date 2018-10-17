// TODO use as a checklist
import { JiraCfg } from './jira';

export const DEFAULT_JIRA_CFG: JiraCfg = {
  isEnabled: true,
  host: null,
  userName: null,
  password: null,
  token: null,

  isAutoPollTickets: true,
  searchJqlQuery: 'assignee = currentUser() AND resolution = Unresolved ORDER BY updatedDate DESC',

  isAutoAddToBacklog: true,
  autoAddBacklogJqlQuery: 'assignee = currentUser() AND sprint in openSprints() AND resolution = Unresolved ORDER BY updatedDate DESC',

  isWorklogEnabled: true,
  isAutoWorklog: false,
  isAddWorklogOnSubTaskDone: true,

  isUpdateIssueFromLocal: false,

  isShowComponents: true,

  isCheckToReAssignTicketOnTaskStart: true,
  userAssigneeName: null,

  isTransitionIssuesEnabled: true,
  availableTransitions: {
    OPEN: 'ALWAYS_ASK',
    IN_PROGRESS: 'ALWAYS_ASK',
    DONE: 'ALWAYS_ASK'
  },
  userToAssignOnDone: null
};

