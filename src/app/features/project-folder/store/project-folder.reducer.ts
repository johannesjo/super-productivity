import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { ProjectFolder, ProjectFolderState } from '../project-folder.model';
import * as ProjectFolderActions from './project-folder.actions';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';

export const projectFolderFeatureKey = 'projectFolder';

export const adapter: EntityAdapter<ProjectFolder> = createEntityAdapter<ProjectFolder>({
  selectId: (projectFolder) => projectFolder.id,
  sortComparer: (a, b) => a.title.localeCompare(b.title),
});

export const initialState: ProjectFolderState = adapter.getInitialState({});

export const projectFolderReducer = createReducer(
  initialState,
  on(loadAllData, (state, { appDataComplete }) =>
    appDataComplete.projectFolder?.ids ? appDataComplete.projectFolder : state,
  ),

  on(ProjectFolderActions.addProjectFolder, (state, { projectFolder }) =>
    adapter.addOne(projectFolder, state),
  ),
  on(ProjectFolderActions.updateProjectFolder, (state, update) =>
    adapter.updateOne(update, state),
  ),
  on(ProjectFolderActions.deleteProjectFolder, (state, { id }) =>
    adapter.removeOne(id, state),
  ),
  on(ProjectFolderActions.toggleFolderExpansion, (state, { id }) => {
    const folder = state.entities[id];
    if (!folder) return state;

    return adapter.updateOne(
      {
        id,
        changes: { isExpanded: !folder.isExpanded },
      },
      state,
    );
  }),
);
