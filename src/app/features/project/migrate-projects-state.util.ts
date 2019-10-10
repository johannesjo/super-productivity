import {ProjectState} from './store/project.reducer';
import {Dictionary} from '@ngrx/entity';
import {Project} from './project.model';
import {DEFAULT_PROJECT, DEFAULT_PROJECT_THEME} from './project.const';
import {DEFAULT_ISSUE_PROVIDER_CFGS} from '../issue/issue.const';
import {getWorklogStr} from '../../util/get-work-log-str';
import {getYesterdaysDate} from '../../util/get-yesterdays-date';
import {MODEL_VERSION_KEY, THEME_COLOR_MAP} from '../../app.constants';
import {isMigrateModel} from '../../util/model-version';

const MODEL_VERSION = 1;

export const migrateProjectState = (projectState: ProjectState): ProjectState => {
  if (!isMigrateModel(projectState, MODEL_VERSION)) {
    return projectState;
  }

  const projectEntities: Dictionary<Project> = {...projectState.entities};
  Object.keys(projectEntities).forEach((key) => {
    projectEntities[key] = _updateThemeModel(projectEntities[key]);
    projectEntities[key] = _addFirstEntryForDayCompleted(projectEntities[key]);

    // NOTE: absolutely needs to come last as otherwise the previous defaults won't work
    projectEntities[key] = _extendProjectDefaults(projectEntities[key]);
  });

  // Update model version after all migrations ran successfully
  projectState[MODEL_VERSION_KEY] = MODEL_VERSION;
  return {
    ...projectState,
    entities: projectEntities,
  };
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

const _addFirstEntryForDayCompleted = (project: Project): Project => {
  return (project.hasOwnProperty('lastCompletedDay'))
    ? project
    : {
      ...project,
      lastCompletedDay: getWorklogStr(getYesterdaysDate())
    };
};

const _updateThemeModel = (project: Project): Project => {
    return (project.hasOwnProperty('theme') && project.theme.primary)
      ? project
      : {
        ...project,
        theme: {
          ...DEFAULT_PROJECT_THEME,
          // tslint:disable-next-line
          primary: (project.themeColor)
            // tslint:disable-next-line
            ? THEME_COLOR_MAP[project.themeColor]
            : DEFAULT_PROJECT_THEME.primary,
          // tslint:disable-next-line
        }
      };

    // TODO delete old theme properties later
  }
;
