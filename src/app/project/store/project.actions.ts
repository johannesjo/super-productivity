import { Action } from '@ngrx/store';

export enum ProjectActionTypes {
  LoadProjects = '[Project] Load Projects'
}

export class LoadProjects implements Action {
  readonly type = ProjectActionTypes.LoadProjects;
}

export type ProjectActions = LoadProjects;
