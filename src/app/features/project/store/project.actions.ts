import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Project } from '../project.model';
import { IssueIntegrationCfg, IssueProviderKey } from '../../issue/issue.model';
import { WorkContextAdvancedCfgKey } from '../../work-context/work-context.model';

export enum ProjectActionTypes {
  'LoadProjectRelatedDataSuccess' = '[Project] Load Project related Data Success',
  'SetCurrentProject' = '[Project] SetCurrentProject',

  // Project Actions
  'LoadProjects' = '[Project] Load Projects',
  'AddProject' = '[Project] Add Project',
  'AddProjects' = '[Project] Add Projects',
  'UpsertProject' = '[Project] Upsert Project',
  'UpdateProject' = '[Project] Update Project',
  'UpdateProjectWorkStart' = '[Project] Update Work Start',
  'UpdateProjectWorkEnd' = '[Project] Update Work End',
  'AddToProjectBreakTime' = '[Project] Add to Break Time',
  'UpdateProjectAdvancedCfg' = '[Project] Update Project Advanced Cfg',
  'UpdateProjectIssueProviderCfg' = '[Project] Update Project Issue Provider Cfg',
  'DeleteProject' = '[Project] Delete Project',
  'DeleteProjects' = '[Project] Delete Projects',
  'ArchiveProject' = '[Project] Archive Project',
  'UnarchiveProject' = '[Project] Unarchive Project',
  'UpdateProjectOrder' = '[Project] Update Project Order',
}

export class LoadProjectRelatedDataSuccess implements Action {
  readonly type: string = ProjectActionTypes.LoadProjectRelatedDataSuccess;

  constructor(public payload: { projectId: string }) {}
}

export class SetCurrentProject implements Action {
  readonly type: string = ProjectActionTypes.SetCurrentProject;

  constructor(public payload: any) {}
}

export class LoadProjects implements Action {
  readonly type: string = ProjectActionTypes.LoadProjects;

  constructor(public payload: { projects: Project[] }) {}
}

export class AddProject implements Action {
  readonly type: string = ProjectActionTypes.AddProject;

  constructor(public payload: { project: Project }) {}
}

export class AddProjects implements Action {
  readonly type: string = ProjectActionTypes.AddProjects;

  constructor(public payload: { projects: Project[] }) {}
}

export class UpsertProject implements Action {
  readonly type: string = ProjectActionTypes.UpsertProject;

  constructor(public payload: { projects: Project[] }) {}
}

export class UpdateProject implements Action {
  readonly type: string = ProjectActionTypes.UpdateProject;

  constructor(public payload: { project: Update<Project> }) {}
}

export class UpdateProjectWorkStart implements Action {
  readonly type: string = ProjectActionTypes.UpdateProjectWorkStart;

  constructor(public payload: { id: string; date: string; newVal: number }) {}
}

export class UpdateProjectWorkEnd implements Action {
  readonly type: string = ProjectActionTypes.UpdateProjectWorkEnd;

  constructor(public payload: { id: string; date: string; newVal: number }) {}
}

export class AddToProjectBreakTime implements Action {
  readonly type: string = ProjectActionTypes.AddToProjectBreakTime;

  constructor(public payload: { id: string; date: string; valToAdd: number }) {}
}

export class UpdateProjectAdvancedCfg implements Action {
  readonly type: string = ProjectActionTypes.UpdateProjectAdvancedCfg;

  constructor(
    public payload: {
      projectId: string;
      sectionKey: WorkContextAdvancedCfgKey;
      data: any;
    },
  ) {}
}

export class UpdateProjectIssueProviderCfg implements Action {
  readonly type: string = ProjectActionTypes.UpdateProjectIssueProviderCfg;

  constructor(
    public payload: {
      projectId: string;
      issueProviderKey: IssueProviderKey;
      providerCfg: Partial<IssueIntegrationCfg>;
      isOverwrite: boolean;
    },
  ) {}
}

export class DeleteProject implements Action {
  readonly type: string = ProjectActionTypes.DeleteProject;

  constructor(public payload: { id: string }) {}
}

export class DeleteProjects implements Action {
  readonly type: string = ProjectActionTypes.DeleteProjects;

  constructor(public payload: { ids: string[] }) {}
}

export class UpdateProjectOrder implements Action {
  readonly type: string = ProjectActionTypes.UpdateProjectOrder;

  constructor(public payload: { ids: string[] }) {}
}

export class ArchiveProject implements Action {
  readonly type: string = ProjectActionTypes.ArchiveProject;

  constructor(public payload: { id: string }) {}
}

export class UnarchiveProject implements Action {
  readonly type: string = ProjectActionTypes.UnarchiveProject;

  constructor(public payload: { id: string }) {}
}

export type ProjectActions =
  | LoadProjects
  | LoadProjectRelatedDataSuccess
  | SetCurrentProject
  | AddProject
  | AddProjects
  | UpsertProject
  | UpdateProject
  | UpdateProjectWorkStart
  | UpdateProjectWorkEnd
  | AddToProjectBreakTime
  | UpdateProjectAdvancedCfg
  | UpdateProjectIssueProviderCfg
  | DeleteProject
  | DeleteProjects
  | UpdateProjectOrder
  | ArchiveProject
  | UnarchiveProject;
