import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { ProjectState } from './project.reducer';
import { Project } from '../project';

export enum ProjectActionTypes {
  LoadState = '[Project] Load Project State',
  SetCurrentProject = '[Project] SetCurrentProject',

  // Project Actions
  LoadProjects = '[Project] Load Projects',
  AddProject = '[Project] Add Project',
  AddProjects = '[Project] Add Projects',
  UpdateProject = '[Project] Update Project',
  UpdateProjects = '[Project] Update Projects',
  DeleteProject = '[Project] Delete Project',
  DeleteProjects = '[Project] Delete Projects',
}

export class LoadState implements Action {
  readonly type = ProjectActionTypes.LoadState;

  constructor(public payload: { state: ProjectState }) {
  }
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

export class UpdateProject implements Action {
  readonly type = ProjectActionTypes.UpdateProject;

  constructor(public payload: { project: Update<Project> }) {
  }
}

export class UpdateProjects implements Action {
  readonly type = ProjectActionTypes.UpdateProjects;

  constructor(public payload: { projects: Update<Project>[] }) {
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
  | LoadState
  | SetCurrentProject
  | AddProject
  | AddProjects
  | UpdateProject
  | UpdateProjects
  | DeleteProject
  | DeleteProjects;

