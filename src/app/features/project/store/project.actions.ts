import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { ProjectState } from './project.reducer';
import { Project, ProjectAdvancedCfgKey } from '../project.model';
import { IssueIntegrationCfg, IssueProviderKey } from '../../issue/issue';

export enum ProjectActionTypes {
  LoadProjectState = '[Project] Load Project State',
  LoadProjectRelatedDataSuccess = '[Project] Load Project related Data Success',
  SetCurrentProject = '[Project] SetCurrentProject',

  // Project Actions
  LoadProjects = '[Project] Load Projects',
  AddProject = '[Project] Add Project',
  AddProjects = '[Project] Add Projects',
  UpsertProject = '[Project] Upsert Project',
  UpdateProject = '[Project] Update Project',
  UpdateProjectAdvancedCfg = '[Project] Update Project Advanced Cfg',
  UpdateProjectIssueProviderCfg = '[Project] Update Project Issue Provider Cfg',
  DeleteProject = '[Project] Delete Project',
  DeleteProjects = '[Project] Delete Projects',
}

export class LoadProjectState implements Action {
  readonly type = ProjectActionTypes.LoadProjectState;

  constructor(public payload: { state: ProjectState }) {
  }
}

export class LoadProjectRelatedDataSuccess implements Action {
  readonly type = ProjectActionTypes.LoadProjectRelatedDataSuccess;
}

export class SetCurrentProject implements Action {
  readonly type = ProjectActionTypes.SetCurrentProject;

  constructor(public payload: any) {
  }
}

export class LoadProjects implements Action {
  readonly type = ProjectActionTypes.LoadProjects;

  constructor(public payload: { projects: Project[] }) {
  }
}

export class AddProject implements Action {
  readonly type = ProjectActionTypes.AddProject;

  constructor(public payload: { project: Project }) {
  }
}

export class AddProjects implements Action {
  readonly type = ProjectActionTypes.AddProjects;

  constructor(public payload: { projects: Project[] }) {
  }
}

export class UpsertProject implements Action {
  readonly type = ProjectActionTypes.UpsertProject;

  constructor(public payload: { projects: Project[] }) {
  }
}

export class UpdateProject implements Action {
  readonly type = ProjectActionTypes.UpdateProject;

  constructor(public payload: { project: Update<Project> }) {
  }
}

export class UpdateProjectAdvancedCfg implements Action {
  readonly type = ProjectActionTypes.UpdateProjectAdvancedCfg;

  constructor(public payload: { projectId: string; sectionKey: ProjectAdvancedCfgKey; data: any }) {
  }
}

export class UpdateProjectIssueProviderCfg implements Action {
  readonly type = ProjectActionTypes.UpdateProjectIssueProviderCfg;

  constructor(public payload: {
    projectId: string;
    issueProviderKey: IssueProviderKey;
    providerCfg: IssueIntegrationCfg,
    isOverwrite: boolean
  }) {
  }
}

export class DeleteProject implements Action {
  readonly type = ProjectActionTypes.DeleteProject;

  constructor(public payload: { id: string }) {
  }
}

export class DeleteProjects implements Action {
  readonly type = ProjectActionTypes.DeleteProjects;

  constructor(public payload: { ids: string[] }) {
  }
}


export type ProjectActions
  = LoadProjects
  | LoadProjectState
  | LoadProjectRelatedDataSuccess
  | SetCurrentProject
  | AddProject
  | AddProjects
  | UpsertProject
  | UpdateProject
  | UpdateProjectAdvancedCfg
  | UpdateProjectIssueProviderCfg
  | DeleteProject
  | DeleteProjects
  ;

