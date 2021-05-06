import { ProjectState } from './store/project.reducer';
import { Dictionary } from '@ngrx/entity';
import { Project } from './project.model';
import { DEFAULT_PROJECT, PROJECT_MODEL_VERSION } from './project.const';
import { DEFAULT_ISSUE_PROVIDER_CFGS } from '../issue/issue.const';
import {
  MODEL_VERSION_KEY,
  THEME_COLOR_MAP,
  WORKLOG_DATE_STR_FORMAT,
} from '../../app.constants';
import { isMigrateModel } from '../../util/model-version';
import * as moment from 'moment';
import { convertToWesternArabic } from '../../util/numeric-converter';
import { WORK_CONTEXT_DEFAULT_THEME } from '../work-context/work-context.const';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';

const MODEL_VERSION = PROJECT_MODEL_VERSION;

export const migrateProjectState = (projectState: ProjectState): ProjectState => {
  if (!isMigrateModel(projectState, MODEL_VERSION, 'Project')) {
    return projectState;
  }

  const projectEntities: Dictionary<Project> = { ...projectState.entities };
  Object.keys(projectEntities).forEach((key) => {
    projectEntities[key] = _updateThemeModel(projectEntities[key] as Project);
    projectEntities[key] = _convertToWesternArabicDateKeys(
      projectEntities[key] as Project,
    );

    // NOTE: absolutely needs to come last as otherwise the previous defaults won't work
    projectEntities[key] = _extendProjectDefaults(projectEntities[key] as Project);
    projectEntities[key] = _removeOutdatedData(projectEntities[key] as Project);
  });

  return {
    ..._fixIds(projectState),
    entities: projectEntities,
    // Update model version after all migrations ran successfully
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
    },
  };
};

const _removeOutdatedData = (project: Project): Project => {
  const copy: any = dirtyDeepCopy(project);
  delete copy.advancedCfg.googleTimeSheetExport;
  delete copy.advancedCfg.simpleSummarySettings;
  delete copy.timeWorkedWithoutBreak;
  return copy;
};

const __convertToWesternArabicDateKeys = (workStartEnd: {
  [key: string]: any;
}): {
  [key: string]: any;
} => {
  return workStartEnd
    ? Object.keys(workStartEnd).reduce((acc, dateKey) => {
        const date = moment(convertToWesternArabic(dateKey));
        if (!date.isValid()) {
          throw new Error(
            'Cannot migrate invalid non western arabic date string ' + dateKey,
          );
        }
        const westernArabicKey = date.locale('en').format(WORKLOG_DATE_STR_FORMAT);
        return {
          ...acc,
          [westernArabicKey]: workStartEnd[dateKey],
        };
      }, {})
    : workStartEnd;
};

const _convertToWesternArabicDateKeys = (project: Project) => {
  return {
    ...project,
    workStart: __convertToWesternArabicDateKeys(project.workStart),
    workEnd: __convertToWesternArabicDateKeys(project.workEnd),
    breakNr: __convertToWesternArabicDateKeys(project.breakNr),
    breakTime: __convertToWesternArabicDateKeys(project.breakTime),
  };
};

const _updateThemeModel = (project: Project): Project => {
  return project.hasOwnProperty('theme') && project.theme.primary
    ? project
    : {
        ...project,
        theme: {
          ...WORK_CONTEXT_DEFAULT_THEME,
          // eslint-disable-next-line
          primary: project.themeColor
            ? // eslint-disable-next-line
              (THEME_COLOR_MAP as any)[project.themeColor]
            : WORK_CONTEXT_DEFAULT_THEME.primary,
          // eslint-disable-next-line
        },
      };

  // TODO delete old theme properties later
};
const _fixIds = (projectState: ProjectState): ProjectState => {
  const currentIds = projectState.ids as string[];
  const allIds = Object.keys(projectState.entities);

  if (!currentIds) {
    console.error('Project Ids not defined');
    console.log('Attempting to fix...');
    return {
      ...projectState,
      ids: allIds,
    };
  }

  if (allIds.length !== currentIds.length) {
    let newIds;
    const allP = allIds.map((id) => projectState.entities[id]);

    const archivedIds = allP
      .filter((p) => (p as Project).isArchived)
      .map((p) => (p as Project).id);
    const unarchivedIds = allP
      .filter((p) => !(p as Project).isArchived)
      .map((p) => (p as Project).id);
    if (currentIds.length === unarchivedIds.length) {
      newIds = [...currentIds, ...archivedIds];
    } else if (currentIds.length === unarchivedIds.length) {
      newIds = [...currentIds, ...unarchivedIds];
    } else {
      throw new Error('Invalid param given to UpdateProjectOrder');
    }

    if (!Array.isArray(newIds)) {
      throw new Error('This should not happen. Error during project migration.');
    }

    return {
      ...projectState,
      ids: newIds || allIds,
    };
  }

  return projectState;
};
