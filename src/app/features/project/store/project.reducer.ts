import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Project } from '../project.model';
import { ProjectActions, ProjectActionTypes } from './project.actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FIRST_PROJECT } from '../project.const';

export const PROJECT_FEATURE_NAME = 'projects';

export interface ProjectState extends EntityState<Project> {
  // additional entities state properties
  currentId: string | null;
  isDataLoaded: boolean;
}

const sortByTitle = (p1: Project, p2: Project) => {
  return p1.title.localeCompare(p2.title);
};

export const projectAdapter: EntityAdapter<Project> = createEntityAdapter<Project>({
  // sortComparer: sortByTitle,
});

// SELECTORS
// ---------
export const selectProjectFeatureState = createFeatureSelector<ProjectState>(PROJECT_FEATURE_NAME);
const {selectIds, selectEntities, selectAll, selectTotal} = projectAdapter.getSelectors();
export const selectCurrentProjectId = createSelector(selectProjectFeatureState, state => state.currentId);
export const selectProjectEntities = createSelector(selectProjectFeatureState, selectEntities);
export const selectAllProjects = createSelector(selectProjectFeatureState, selectAll);
export const selectIsAllProjectDataLoaded = createSelector(selectProjectFeatureState, state => state.isDataLoaded);
export const selectCurrentProject = createSelector(selectProjectFeatureState,
  (state) => state.entities[state.currentId]
);
export const selectProjectIssueCfgs = createSelector(selectCurrentProject, (project) => project.issueIntegrationCfgs);
export const selectProjectJiraCfg = createSelector(selectProjectIssueCfgs, (issueProviderCfgs) => issueProviderCfgs.JIRA);
export const selectProjectGitCfg = createSelector(selectProjectIssueCfgs, (issueProviderCfgs) => issueProviderCfgs.GIT);
export const selectAdvancedProjectCfg = createSelector(selectCurrentProject, (project) => project.advancedCfg);


// DYNAMIC SELECTORS
// -----------------
export const selectProjectById = createSelector(
  selectProjectFeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);

// DEFAULT
// -------
export const initialProjectState: ProjectState = projectAdapter.getInitialState({
  currentId: FIRST_PROJECT.id,
  ids: [
    FIRST_PROJECT.id
  ],
  entities: {
    [FIRST_PROJECT.id]: FIRST_PROJECT
  },
  isDataLoaded: false,
});


// REDUCER
// -------
export function projectReducer(
  state: ProjectState = initialProjectState,
  action: ProjectActions
): ProjectState {

  const payload = action['payload'];

  switch (action.type) {
    // Meta Actions
    // ------------
    case ProjectActionTypes.LoadProjectState: {
      return {...action.payload.state};
    }

    case ProjectActionTypes.LoadProjectRelatedDataSuccess: {
      return {
        ...state,
        isDataLoaded: true,
      };
    }

    case ProjectActionTypes.SetCurrentProject: {
      return {
        ...state,
        currentId: payload,
      };
    }

    // Project Actions
    // ------------
    case ProjectActionTypes.AddProject: {
      return projectAdapter.addOne(payload.project, state);
    }

    case ProjectActionTypes.UpsertProject: {
      return projectAdapter.upsertOne(payload.project, state);
    }

    case ProjectActionTypes.AddProjects: {
      return projectAdapter.addMany(payload.projects, state);
    }

    case ProjectActionTypes.UpdateProject: {
      return projectAdapter.updateOne(payload.project, state);
    }

    case ProjectActionTypes.UpdateProjectWorkStart: {
      const {id, date, newVal} = action.payload;
      const oldP = state.entities[id];
      return projectAdapter.updateOne({
        id,
        changes: {
          workStart: {
            ...oldP.workStart,
            [date]: newVal,
          }
        }
      }, state);
    }

    case ProjectActionTypes.UpdateProjectWorkEnd: {
      const {id, date, newVal} = action.payload;
      const oldP = state.entities[id];
      return projectAdapter.updateOne({
        id,
        changes: {
          workEnd: {
            ...oldP.workEnd,
            [date]: newVal,
          }
        }
      }, state);
    }

    case ProjectActionTypes.DeleteProject: {
      return projectAdapter.removeOne(payload.id, state);
    }

    case ProjectActionTypes.DeleteProjects: {
      return projectAdapter.removeMany(payload.ids, state);
    }

    case ProjectActionTypes.LoadProjects: {
      return projectAdapter.addAll(payload.projects, state);
    }

    case ProjectActionTypes.UpdateProjectAdvancedCfg: {
      const {projectId, sectionKey, data} = payload;
      const currentProject = state.entities[projectId];
      const advancedCfg = Object.assign({}, currentProject.advancedCfg);
      return projectAdapter.updateOne({
        id: projectId,
        changes: {
          advancedCfg: {
            ...advancedCfg,
            [sectionKey]: {
              ...advancedCfg[sectionKey],
              ...data,
            }
          }
        }
      }, state);
    }

    case ProjectActionTypes.UpdateProjectIssueProviderCfg: {
      const {projectId, providerCfg, issueProviderKey, isOverwrite} = action.payload;
      const currentProject = state.entities[projectId];
      return projectAdapter.updateOne({
        id: projectId,
        changes: {
          issueIntegrationCfgs: {
            ...currentProject.issueIntegrationCfgs,
            [issueProviderKey]: {
              ...(isOverwrite ? {} : currentProject.issueIntegrationCfgs[issueProviderKey]),
              ...providerCfg,
            }
          }
        }
      }, state);
    }

    case ProjectActionTypes.UpdateProjectOrder: {
      return {...state, ids: action.payload.ids};
    }

    default: {
      return state;
    }
  }
}
