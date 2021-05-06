import { Project } from './project.model';
import { DEFAULT_ISSUE_PROVIDER_CFGS } from '../issue/issue.const';
import {
  DEFAULT_PROJECT_COLOR,
  WORK_CONTEXT_DEFAULT_COMMON,
  WORK_CONTEXT_DEFAULT_THEME,
} from '../work-context/work-context.const';

export const DEFAULT_PROJECT: Project = {
  id: '',
  title: '',
  isArchived: false,
  issueIntegrationCfgs: DEFAULT_ISSUE_PROVIDER_CFGS,
  taskIds: [],
  backlogTaskIds: [],
  ...WORK_CONTEXT_DEFAULT_COMMON,
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_PROJECT_COLOR,
  },
};

export const DEFAULT_PROJECT_ID = 'DEFAULT';

export const FIRST_PROJECT: Project = {
  ...DEFAULT_PROJECT,
  id: DEFAULT_PROJECT_ID,
  title: 'Super Productivity',
  workStart: {},
  workEnd: {},
};

export const PROJECT_MODEL_VERSION = 5.2;
