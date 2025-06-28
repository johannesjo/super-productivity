import { IssueProviderKey } from '../issue/issue.model';
import {
  WorkContextAdvancedCfgKey,
  WorkContextCommon,
} from '../work-context/work-context.model';
import { EntityState } from '@ngrx/entity';
import { MODEL_VERSION_KEY } from '../../app.constants';

export type RoundTimeOption = '5M' | 'QUARTER' | 'HALF' | 'HOUR' | null | undefined;

export interface ProjectBasicCfg {
  title: string;
  // TODO remove maybe
  isArchived?: boolean;
  isHiddenFromMenu?: boolean;
  isEnableBacklog?: boolean;
  taskIds: string[];
  backlogTaskIds: string[];
  noteIds: string[];
}

// Import the unified Project type from plugin-api
import { Project as PluginProject } from '@super-productivity/plugin-api';

// Omit conflicting properties from PluginProject when extending
export interface ProjectCopy
  extends Omit<PluginProject, 'advancedCfg' | 'theme'>,
    ProjectBasicCfg,
    WorkContextCommon {
  // Additional app-specific fields
  issueIntegrationCfgs?: any;
}

export type Project = Readonly<ProjectCopy>;

export type ProjectCfgFormKey =
  | WorkContextAdvancedCfgKey
  | IssueProviderKey
  | 'basic'
  | 'theme';

export interface ProjectState extends EntityState<Project> {
  [MODEL_VERSION_KEY]?: number;
}
