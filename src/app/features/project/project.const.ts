import {Project} from './project.model';
import {DEFAULT_ISSUE_PROVIDER_CFGS} from '../issue/issue.const';
import {WORK_CONTEXT_DEFAULT_THEME, WORK_CONTEXT_DEFAULT_COMMON} from '../work-context/work-context.const';


export const DEFAULT_PROJECT: Project = {
  id: null,
  title: '',
  themeColor: '',
  isArchived: false,
  issueIntegrationCfgs: DEFAULT_ISSUE_PROVIDER_CFGS,
  taskIds: [],
  backlogTaskIds: [],
  ...WORK_CONTEXT_DEFAULT_COMMON
};


export const DEFAULT_PROJECT_ID = 'DEFAULT';

export const FIRST_PROJECT: Project = {
  ...DEFAULT_PROJECT,
  id: DEFAULT_PROJECT_ID,
  title: 'Super Productivity',
  workStart: {},
  workEnd: {},
  theme: WORK_CONTEXT_DEFAULT_THEME
};
