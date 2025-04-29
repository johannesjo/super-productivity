import { Dictionary } from '@ngrx/entity';
import { Project, ProjectState } from './project.model';
import { DEFAULT_PROJECT } from './project.const';
import { MODEL_VERSION_KEY, THEME_COLOR_MAP } from '../../app.constants';
import { isMigrateModel } from '../../util/is-migrate-model';
import { WORK_CONTEXT_DEFAULT_THEME } from '../work-context/work-context.const';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { MODEL_VERSION } from '../../core/model-version';

export const migrateProjectState = (projectState: ProjectState): ProjectState => {
  if (!isMigrateModel(projectState, MODEL_VERSION.PROJECT, 'Project')) {
    return projectState;
  }

  const projectEntities: Dictionary<Project> = { ...projectState.entities };
  Object.keys(projectEntities).forEach((key) => {
    projectEntities[key] = _updateThemeModel(projectEntities[key] as Project);

    // NOTE: absolutely needs to come last as otherwise the previous defaults won't work
    projectEntities[key] = _extendProjectDefaults(projectEntities[key] as Project);
    projectEntities[key] = _removeOutdatedData(projectEntities[key] as Project);
  });

  return {
    ..._fixIds(projectState),
    entities: projectEntities,
    // Update model version after all migrations ran successfully
    [MODEL_VERSION_KEY]: MODEL_VERSION.PROJECT,
  };
};

const _extendProjectDefaults = (project: Project): Project => {
  return {
    ...DEFAULT_PROJECT,
    ...project,
    // enable backlog if value was never set
    isEnableBacklog:
      typeof (project.isEnableBacklog as unknown) === 'boolean'
        ? project.isEnableBacklog
        : project.isEnableBacklog === undefined,
    noteIds: project.noteIds || [],
    // also add missing issue integration cfgs
  };
};

const _removeOutdatedData = (project: Project): Project => {
  const copy: any = dirtyDeepCopy(project);
  delete copy.advancedCfg.googleTimeSheetExport;
  delete copy.advancedCfg.simpleSummarySettings;
  delete copy.timeWorkedWithoutBreak;
  delete copy.themeColor;
  delete copy.isDarkTheme;
  delete copy.isReducedTheme;
  return copy;
};

const _updateThemeModel = (project: Project): Project => {
  return project.hasOwnProperty('theme') && project.theme.primary
    ? project
    : {
        ...project,
        theme: {
          ...WORK_CONTEXT_DEFAULT_THEME,
          // eslint-disable-next-line
          primary: (project as any).themeColor
            ? // eslint-disable-next-line
              (THEME_COLOR_MAP as any)[(project as any).themeColor]
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
