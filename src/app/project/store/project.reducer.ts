import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
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
export const selectProjectGitCfg = createSelector(selectProjectIssueCfgs, (issueProviderCfgs) => issueProviderCfgs.GIT);
export const selectAdvancedProjectCfg = createSelector(selectCurrentProject, (project) => project.advancedCfg);


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
        startedTimeToday: Date.now()
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

  const {payload} = action;


  switch (action.type) {
    // Meta Actions
    // ------------
    case ProjectActionTypes.LoadProjectState: {
      return addStartedTimeToday(
        {...action.payload.state},
        payload.state.currentId
      );
    }

    case ProjectActionTypes.SetCurrentProject: {
      return addStartedTimeToday(
        {
          ...state,
          currentId: payload,
        },
        payload
      );
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

    default: {
      return state;
    }
  }
}
