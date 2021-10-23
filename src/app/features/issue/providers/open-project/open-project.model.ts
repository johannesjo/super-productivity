import { JiraWorklogExportDefaultTime } from '../jira/jira.model';
import { BaseIssueProviderCfg } from '../../issue.model';

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
}
