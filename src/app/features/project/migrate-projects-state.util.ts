import {ProjectState} from './store/project.reducer';
import {Dictionary} from '@ngrx/entity';
import {Project} from './project.model';
import {DEFAULT_PROJECT} from './project.const';
import {DEFAULT_ISSUE_PROVIDER_CFGS} from '../issue/issue.const';

export const migrateProjectState = (projectState: ProjectState): ProjectState => {
  const projectEntities: Dictionary<Project> = {...projectState.entities};
  Object.keys(projectEntities).forEach((key) => {
    projectEntities[key] = _extendProjectDefaults(projectEntities[key]);
  });
  return {...projectState, entities: projectEntities};
};


const _extendProjectDefaults = (project: Project): Project => {
  return {
    ...DEFAULT_PROJECT,
    ...project,
    // also add missing issue integration cfgs
    issueIntegrationCfgs: {
      ...DEFAULT_ISSUE_PROVIDER_CFGS,
      ...project.issueIntegrationCfgs,
    }
  };
};
