export interface OldTimeSpentOnDay {
  [key: string]: string;
}

export interface OldTask {
  title: string;
  id: string;
  isDone: boolean;
  subTasks: OldTask[];
  timeEstimate: string;
  timeSpent: string;
  timeSpentOnDay: OldTimeSpentOnDay;
  created?: string;

  originalId?: string;
  originalType?: 'JIRA' | 'GIT';

  // NOT MIGRATED
  originalAssigneeKey?: string;
  originalComments?: any[];
  originalEstimate?: any;
  originalKey?: string;
  originalLink?: string;
  originalTimeSpent?: string;
  originalUpdated?: string;
  originalStatus?: any;
  originalAttachment?: any;
  originalChangelog?: any;

  isUpdated?: boolean;
  progress?: any;
  mainTaskTimeEstimate?: string;
  mainTaskTimeSpent?: string;
  mainTaskTimeSpentOnDay?: OldTimeSpentOnDay;
  doneDate?: string;
  lastWorkedOn?: string;
  showNotes?: false;
  started?: string;
  status?: string;
}

export interface OldJiraSettings {
  host: string;
  isAddWorklogOnSubTaskDone: boolean;
  isAutoPollTickets: boolean;
  isAutoWorklog: boolean;
  isCheckToReAssignTicketOnTaskStart: boolean;
  isEnabledAutoAdd: boolean;
  isFirstLogin: boolean;
  isJiraEnabled: boolean;
  isShowComponents: boolean;
  isTransitionIssuesEnabled: boolean;
  isUpdateIssueFromLocal: boolean;
  isWorklogEnabled: boolean;
  jqlQuery: string;
  jqlQueryAutoAdd: string;
  password: string;
  transitions: any;
  userAssigneeName: string;
  userName: string;
}

export interface OldProjectData {
  tasks: OldTask[];
  backlogTasks: OldTask[];
  doneBacklogTasks: OldTask[];
  theme: string;
  jiraSettings: OldJiraSettings;

  // not migrated
  currentSession: any;
  distractions: any;
  git: any;
  lastActiveTaskTask: any;
  note: any;
  startedTimeToday: any;
}

export interface OldProject {
  title: string;
  id: string;
  data: OldProjectData;
}

