import {ProjectState} from './store/project.reducer';
import {Dictionary} from '@ngrx/entity';
import {Project} from './project.model';
import {DEFAULT_PROJECT} from './project.const';
import {DEFAULT_ISSUE_PROVIDER_CFGS, issueProviderKeys} from '../issue/issue.const';
import {MODEL_VERSION_KEY, THEME_COLOR_MAP, WORKLOG_DATE_STR_FORMAT} from '../../app.constants';
import {isMigrateModel} from '../../util/model-version';
import * as moment from 'moment';
import {convertToWesternArabic} from '../../util/numeric-converter';
import {LS_ISSUE_STATE, LS_PROJECT_PREFIX} from '../../core/persistence/ls-keys.const';
import {IssueProviderKey} from '../issue/issue.model';
import * as localForage from 'localforage';
import {WORK_CONTEXT_DEFAULT_THEME} from '../work-context/work-context.const';
import {dirtyDeepCopy} from '../../util/dirtyDeepCopy';

const MODEL_VERSION = 4;
export const PROJECT_MODEL_VERSION = MODEL_VERSION;

export const migrateProjectState = (projectState: ProjectState): ProjectState => {
  if (!isMigrateModel(projectState, MODEL_VERSION)) {
    return projectState;
  }

  const projectEntities: Dictionary<Project> = {...projectState.entities};
  Object.keys(projectEntities).forEach((key) => {
    projectEntities[key] = _updateThemeModel(projectEntities[key]);
    projectEntities[key] = _convertToWesternArabicDateKeys(projectEntities[key]);

    // NOTE: absolutely needs to come last as otherwise the previous defaults won't work
    projectEntities[key] = _extendProjectDefaults(projectEntities[key]);
    projectEntities[key] = _removeOutdatedData(projectEntities[key]);

    _deleteIssueData(projectEntities[key]);
  });

  // Update model version after all migrations ran successfully
  projectState[MODEL_VERSION_KEY] = MODEL_VERSION;
  return {
    ...projectState,
    entities: projectEntities,
    [MODEL_VERSION_KEY]: MODEL_VERSION,
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

const _removeOutdatedData = (project: Project): Project => {
  const copy: any = dirtyDeepCopy(project);
  delete copy.advancedCfg.googleTimeSheetExport;
  delete copy.advancedCfg.simpleSummarySettings;
  delete copy.timeWorkedWithoutBreak;
  return copy;
};


const ___convertToWesternArabicDateKeys = (workStartEnd: {
  [key: string]: any;
}): {
  [key: string]: any;
} => {
  return (workStartEnd)
    ? Object.keys(workStartEnd).reduce((acc, dateKey) => {
      const date = moment(convertToWesternArabic(dateKey));
      if (!date.isValid()) {
        throw new Error('Cannot migrate invalid non western arabic date string ' + dateKey);
      }
      const westernArabicKey = date.locale('en').format(WORKLOG_DATE_STR_FORMAT);
      return {
        ...acc,
        [westernArabicKey]: workStartEnd[dateKey]
      };
    }, {})
    : workStartEnd;
};

const _convertToWesternArabicDateKeys = (project: Project) => {
  return {
    ...project,
    workStart: ___convertToWesternArabicDateKeys(project.workStart),
    workEnd: ___convertToWesternArabicDateKeys(project.workEnd),
    breakNr: ___convertToWesternArabicDateKeys(project.breakNr),
    breakTime: ___convertToWesternArabicDateKeys(project.breakTime),
  };
};


const _updateThemeModel = (project: Project): Project => {
    return (project.hasOwnProperty('theme') && project.theme.primary)
      ? project
      : {
        ...project,
        theme: {
          ...WORK_CONTEXT_DEFAULT_THEME,
          // tslint:disable-next-line
          primary: (project.themeColor)
            // tslint:disable-next-line
            ? THEME_COLOR_MAP[project.themeColor]
            : WORK_CONTEXT_DEFAULT_THEME.primary,
          // tslint:disable-next-line
        }
      };

    // TODO delete old theme properties later
  }
;

const _deleteIssueData = (project: Project) => {
  issueProviderKeys.forEach(key => {
    __removeIssueDataForProject(project.id, key);
  });
};

const __removeIssueDataForProject = (projectId, issueType: IssueProviderKey) => {
  const _makeProjectKey = (projectIdIn, subKey, additional?) => {
    return LS_PROJECT_PREFIX + projectIdIn + '_' + subKey + (additional ? '_' + additional : '');
  };
  const projectKey = _makeProjectKey(projectId, LS_ISSUE_STATE, issueType);
  localForage.ready().then(() => localForage.removeItem(projectKey));
};
