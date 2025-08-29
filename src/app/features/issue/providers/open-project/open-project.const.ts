import { OpenProjectCfg } from './open-project.model';
import { JiraWorklogExportDefaultTime } from '../jira/jira.model';
export { OPEN_PROJECT_ISSUE_CONTENT_CONFIG } from './open-project-issue-content.const';
export {
  OPEN_PROJECT_CONFIG_FORM_SECTION,
  OPEN_PROJECT_CONFIG_FORM,
} from './open-project-cfg-form.const';

export const DEFAULT_OPEN_PROJECT_CFG: OpenProjectCfg = {
  isEnabled: false,
  host: null,
  projectId: null,
  token: null,
  isShowTimeTrackingDialog: false,
  isShowTimeTrackingDialogForEachSubTask: false,
  timeTrackingDialogDefaultTime: JiraWorklogExportDefaultTime.AllTime,
  filterUsername: null,
  scope: 'created-by-me',
  isTransitionIssuesEnabled: false,
  isSetProgressOnTaskDone: false,
  progressOnDone: 0,
  availableTransitions: [],
  transitionConfig: {
    // OPEN: 'DO_NOT',
    IN_PROGRESS: 'ALWAYS_ASK',
    DONE: 'ALWAYS_ASK',
  },
  metadata: undefined,
};

export const OPEN_PROJECT_POLL_INTERVAL = 5 * 60 * 1000;
export const OPEN_PROJECT_INITIAL_POLL_DELAY = 8 * 1000;
