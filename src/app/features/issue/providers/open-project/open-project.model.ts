export interface OpenProjectCfg {
  isSearchIssuesFromOpenProject: boolean;
  isAutoAddToBacklog: boolean;
  isAutoPoll: boolean;
  isShowTimeTrackingDialog: boolean;
  isShowTimeTrackingDialogForEachSubTask: boolean;
  filterUsername: string | null;
  host: string | null;
  projectId: string | null;
  token: string | null;
}
