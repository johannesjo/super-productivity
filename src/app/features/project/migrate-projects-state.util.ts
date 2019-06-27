import {ProjectState} from './store/project.reducer';
import {Dictionary} from '@ngrx/entity';
import {Project} from './project.model';
import {DEFAULT_PROJECT} from './project.const';
import {DEFAULT_ISSUE_PROVIDER_CFGS} from '../issue/issue.const';
import {getWorklogStr} from '../../util/get-work-log-str';

export const migrateProjectState = (projectState: ProjectState): ProjectState => {
  const projectEntities: Dictionary<Project> = {...projectState.entities};
  Object.keys(projectEntities).forEach((key) => {
    projectEntities[key] = _extendProjectDefaults(projectEntities[key]);
    projectEntities[key] = _addFirstEntryForDayCompleted(projectEntities[key]);
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


const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

const _addFirstEntryForDayCompleted = (project: Project): Project => {
  const dayCompleted = project.dayCompleted;

  return (dayCompleted && Object.keys(dayCompleted).length)
    ? project
    : {
      ...project,
      dayCompleted: {
        [getWorklogStr(yesterday)]: true
      }
    };
};
