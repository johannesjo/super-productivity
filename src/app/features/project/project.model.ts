import { IssueIntegrationCfgs, IssueProviderKey } from '../issue/issue.model';
import {
  WorkContextAdvancedCfgKey,
  WorkContextCommon,
} from '../work-context/work-context.model';

export type RoundTimeOption = '5M' | 'QUARTER' | 'HALF' | 'HOUR' | null;

export interface ProjectBasicCfg {
  title: string;
  /** @deprecated use new theme model instead. */
  themeColor?: string;
  /** @deprecated use new theme model instead. */
  isDarkTheme?: boolean;
  /** @deprecated use new theme model instead. */
  isReducedTheme?: boolean;
  isArchived: boolean;

  taskIds: string[];
  backlogTaskIds: string[];
}

export interface ProjectCopy extends ProjectBasicCfg, WorkContextCommon {
  id: string;
  issueIntegrationCfgs: IssueIntegrationCfgs;
}

export type Project = Readonly<ProjectCopy>;

export type ProjectCfgFormKey =
  | WorkContextAdvancedCfgKey
  | IssueProviderKey
  | 'basic'
  | 'theme';
