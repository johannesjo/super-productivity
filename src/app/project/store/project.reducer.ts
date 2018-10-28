import { createEntityAdapter, EntityAdapter, EntityState, Update } from '@ngrx/entity';
import { Project } from '../project';
import { ProjectActions, ProjectActionTypes } from './project.actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FIRST_PROJECT } from '../project.const';

export const PROJECT_FEATURE_NAME = 'projects';

export interface ProjectState extends EntityState<Project> {
  // additional entities state properties
  currentId: string | null;
}

export const projectAdapter: EntityAdapter<Project> = createEntityAdapter<Project>();

// SELECTORS
// ---------
export const selectProjectFeatureState = createFeatureSelector<ProjectState>(PROJECT_FEATURE_NAME);
const {selectIds, selectEntities, selectAll, selectTotal} = projectAdapter.getSelectors();
export const selectCurrentProjectId = createSelector(selectProjectFeatureState, state => state.currentId);
export const selectAllProjects = createSelector(selectProjectFeatureState, selectAll);
export const selectCurrentProject = createSelector(selectProjectFeatureState,
  (state) => state.entities[state.currentId]
);
export const selectProjectIssueCfgs = createSelector(selectCurrentProject, (project) => project.issueIntegrationCfgs);
export const selectProjectJiraCfg = createSelector(selectProjectIssueCfgs, (issueProviderCfgs) => issueProviderCfgs.JIRA);


// DEFAULT
// -------
export const initialState: ProjectState = projectAdapter.getInitialState({
  currentId: FIRST_PROJECT.id,
  ids: [
    FIRST_PROJECT.id
  ],
  entities: {
    [FIRST_PROJECT.id]: FIRST_PROJECT
  }
});

// REDUCER
// -------
export function projectReducer(
  state: ProjectState = initialState,
  action: ProjectActions
): ProjectState {
  // console.log(state.entities, state, action);

  switch (action.type) {
    // Meta Actions
    // ------------
    case ProjectActionTypes.LoadProjectState: {
      return Object.assign({}, action.payload.state);
    }

    case ProjectActionTypes.SetCurrentProject: {
      return Object.assign({}, state, {currentId: action.payload});
    }

    // Project Actions
    // ------------
    case ProjectActionTypes.AddProject: {
      return projectAdapter.addOne(action.payload.project, state);
    }

    case ProjectActionTypes.AddProjects: {
      return projectAdapter.addMany(action.payload.projects, state);
    }

    case ProjectActionTypes.UpdateProject: {
      return projectAdapter.updateOne(action.payload.project, state);
    }

    case ProjectActionTypes.UpdateProjects: {
      return projectAdapter.updateMany(action.payload.projects, state);
    }

    case ProjectActionTypes.DeleteProject: {
      return projectAdapter.removeOne(action.payload.id, state);
    }

    case ProjectActionTypes.DeleteProjects: {
      return projectAdapter.removeMany(action.payload.ids, state);
    }

    case ProjectActionTypes.LoadProjects: {
      return projectAdapter.addAll(action.payload.projects, state);
    }

    case ProjectActionTypes.SaveProjectIssueConfig: {
      const currentProject = state.entities[action.payload.projectId];
      const issueProviderCfg = Object.assign({}, currentProject.issueIntegrationCfgs);
      const update = {
        id: action.payload.projectId,
        changes: {
          issueProviderCfg: issueProviderCfg
        }
      } as Update<Project>;
      return projectAdapter.updateOne(update, state);
    }

    default: {
      return state;
    }
  }
}
