import {ProjectState} from './store/project.reducer';
import {Dictionary} from '@ngrx/entity';
import {Project} from './project.model';
import {DEFAULT_PROJECT, DEFAULT_PROJECT_THEME} from './project.const';
import {DEFAULT_ISSUE_PROVIDER_CFGS} from '../issue/issue.const';
import {getWorklogStr} from '../../util/get-work-log-str';
import {getYesterdaysDate} from '../../util/get-yesterdays-date';
import {THEME_COLOR_MAP} from '../../app.constants';

export const migrateProjectState = (projectState: ProjectState): ProjectState => {
  const projectEntities: Dictionary<Project> = {...projectState.entities};
  Object.keys(projectEntities).forEach((key) => {
    projectEntities[key] = _extendProjectDefaults(projectEntities[key]);
    projectEntities[key] = _addFirstEntryForDayCompleted(projectEntities[key]);
    projectEntities[key] = _updateThemeModel(projectEntities[key]);
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

const _addFirstEntryForDayCompleted = (project: Project): Project => {
  return (project.hasOwnProperty('lastCompletedDay'))
    ? project
    : {
      ...project,
      lastCompletedDay: getWorklogStr(getYesterdaysDate())
    };
};

const _updateThemeModel = (project: Project): Project => {
    return (project.hasOwnProperty('theme'))
      ? project
      : {
        ...project,
        theme: {
          ...DEFAULT_PROJECT_THEME,
          primary: (project.themeColor)
            ? THEME_COLOR_MAP[project.themeColor]
            : DEFAULT_PROJECT_THEME.primary,
          isDarkTheme: project.isDarkTheme,
          isReducedTheme: project.isReducedTheme,
        }
      };

    // TODO delete old theme properties later
  }
;
