import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Project } from '../project';
import { ProjectActions } from './project.actions';
import { ProjectActionTypes } from './project.actions';
import { createFeatureSelector } from '@ngrx/store';
import { createSelector } from '@ngrx/store';

export const PROJECT_FEATURE_NAME = 'projects';

export interface ProjectState extends EntityState<Project> {
  // additional entities state properties
  currentProjectId: string | null;
}

export const projectAdapter: EntityAdapter<Project> = createEntityAdapter<Project>();

// SELECTORS
// ---------
export const selectProjectFeatureState = createFeatureSelector<ProjectState>(PROJECT_FEATURE_NAME);
const {selectIds, selectEntities, selectAll, selectTotal} = projectAdapter.getSelectors();
export const selectCurrentProjectId = createSelector(selectProjectFeatureState, state => state.currentProjectId);
export const selectAllProjects = createSelector(selectProjectFeatureState, selectAll);

// REDUCER
// -------
export const initialState: ProjectState = projectAdapter.getInitialState({
  currentProjectId: null,
});

export function projectReducer(
  state = initialState,
  action: ProjectActions
): ProjectState {
  console.log(state.entities, state, action);

  switch (action.type) {
    // Meta Actions
    // ------------
    case ProjectActionTypes.LoadState: {
      return Object.assign({}, action.payload.state);
    }

    case ProjectActionTypes.SetCurrentProject: {
      return Object.assign({}, state, {currentProjectId: action.payload});
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

    case ProjectActionTypes.DeleteProjects: {
      return projectAdapter.removeMany(action.payload.ids, state);
    }

    case ProjectActionTypes.LoadProjects: {
      return projectAdapter.addAll(action.payload.projects, state);
    }

    default: {
      return state;
    }
  }
}
