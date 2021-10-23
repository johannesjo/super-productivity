import { Dictionary } from '@ngrx/entity';
import { Project, ProjectState } from './project.model';
import { DEFAULT_PROJECT, PROJECT_MODEL_VERSION } from './project.const';
import {
  CALDAV_TYPE,
  DEFAULT_ISSUE_PROVIDER_CFGS,
  GITHUB_TYPE,
  GITLAB_TYPE,
  OPEN_PROJECT_TYPE,
} from '../issue/issue.const';
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
import { isGitlabEnabledLegacy } from '../issue/providers/gitlab/is-gitlab-enabled';
import { isGithubEnabledLegacy } from '../issue/providers/github/is-github-enabled.util';
import { isCaldavEnabledLegacy } from '../issue/providers/caldav/is-caldav-enabled.util';
import { isOpenProjectEnabledLegacy } from '../issue/providers/open-project/is-open-project-enabled.util';
import { GithubCfg } from '../issue/providers/github/github.model';
import { GitlabCfg } from '../issue/providers/gitlab/gitlab';
import { CaldavCfg } from '../issue/providers/caldav/caldav.model';
import { OpenProjectCfg } from '../issue/providers/open-project/open-project.model';

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
    projectEntities[key] = _migrateIsEnabledForIssueProviders(
      projectEntities[key] as Project,
    );
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

const _migrateIsEnabledForIssueProviders = (project: Project): Project => {
  return {
    ...project,
    // also add missing issue integration cfgs
    issueIntegrationCfgs: {
      ...project.issueIntegrationCfgs,
      GITHUB: {
        ...(project.issueIntegrationCfgs[GITHUB_TYPE] as GithubCfg),
        isEnabled: isGithubEnabledLegacy(
          project.issueIntegrationCfgs[GITHUB_TYPE] as GithubCfg,
        ),
      },
      GITLAB: {
        ...(project.issueIntegrationCfgs[GITLAB_TYPE] as GitlabCfg),
        isEnabled: isGitlabEnabledLegacy(
          project.issueIntegrationCfgs[GITLAB_TYPE] as GitlabCfg,
        ),
      },
      CALDAV: {
        ...(project.issueIntegrationCfgs[CALDAV_TYPE] as CaldavCfg),
        isEnabled: isCaldavEnabledLegacy(
          project.issueIntegrationCfgs[CALDAV_TYPE] as CaldavCfg,
        ),
      },
      OPEN_PROJECT: {
        ...(project.issueIntegrationCfgs[OPEN_PROJECT_TYPE] as OpenProjectCfg),
        isEnabled: isOpenProjectEnabledLegacy(
          project.issueIntegrationCfgs[OPEN_PROJECT_TYPE] as OpenProjectCfg,
        ),
      },
    },
  };
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

const _convertToWesternArabicDateKeys = (project: Project): Project => {
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
