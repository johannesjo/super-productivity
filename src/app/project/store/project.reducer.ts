import { createEntityAdapter, EntityAdapter, EntityState, Update } from '@ngrx/entity';
import { Project } from '../project.model';
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
export const selectProjectEntities = createSelector(selectProjectFeatureState, selectEntities);
export const selectAllProjects = createSelector(selectProjectFeatureState, selectAll);
export const selectCurrentProject = createSelector(selectProjectFeatureState,
  (state) => state.entities[state.currentId]
);
export const selectProjectIssueCfgs = createSelector(selectCurrentProject, (project) => project.issueIntegrationCfgs);
export const selectProjectJiraCfg = createSelector(selectProjectIssueCfgs, (issueProviderCfgs) => issueProviderCfgs.JIRA);


// DEFAULT
// -------
export const initialProjectState: ProjectState = projectAdapter.getInitialState({
  currentId: FIRST_PROJECT.id,
  ids: [
    FIRST_PROJECT.id
  ],
  entities: {
    [FIRST_PROJECT.id]: FIRST_PROJECT
  }
});

const addStartedTimeToday = (state, currentProjectId): ProjectState => {
  const curProject: Project = state.entities[currentProjectId];
  const oldDate = new Date(curProject.startedTimeToday);
  const now = new Date();

  // if same day just keep the old string
  if (curProject.startedTimeToday && oldDate.setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0)) {
    return state;
  } else {
    return projectAdapter.updateOne({
      id: currentProjectId,
      changes: {
        startedTimeToday: new Date().toString()
      }
    }, state);
  }

};

// REDUCER
// -------
export function projectReducer(
  state: ProjectState = initialProjectState,
  action: ProjectActions
): ProjectState {
  // console.log(state.entities, state, action);

  switch (action.type) {
    // Meta Actions
    // ------------
    case ProjectActionTypes.LoadProjectState: {
      return addStartedTimeToday(
        Object.assign({}, action.payload.state),
        action.payload.state.currentId
      );
    }

    case ProjectActionTypes.SetCurrentProject: {
      return addStartedTimeToday(
        Object.assign({}, state, {currentId: action.payload}),
        action.payload
      );
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
