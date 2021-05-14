import * as contextActions from './work-context.actions';
import { WorkContext, WorkContextState, WorkContextType } from '../work-context.model';
import {
  Action,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
} from '@ngrx/store';
import {
  selectProjectById,
  selectProjectFeatureState,
} from '../../project/store/project.reducer';
import { selectTagById, selectTagFeatureState } from '../../tag/store/tag.reducer';
import { TODAY_TAG } from '../../tag/tag.const';

export const WORK_CONTEXT_FEATURE_NAME = 'context';

export const selectContextFeatureState = createFeatureSelector<WorkContextState>(
  WORK_CONTEXT_FEATURE_NAME,
);
export const selectActiveContextId = createSelector(
  selectContextFeatureState,
  (state) => state.activeId,
);
export const selectActiveContextType = createSelector(
  selectContextFeatureState,
  (state) => state.activeType,
);

export const selectActiveContextTypeAndId = createSelector(
  selectContextFeatureState,
  (
    state: WorkContextState,
  ): {
    activeId: string;
    activeType: WorkContextType;
    // additional entities state properties
  } => ({
    activeType: state.activeType as WorkContextType,
    activeId: state.activeId as string,
  }),
);

export const selectActiveWorkContext = createSelector(
  selectActiveContextTypeAndId,
  selectProjectFeatureState,
  selectTagFeatureState,
  ({ activeId, activeType }, projectState, tagState): WorkContext => {
    if (activeType === WorkContextType.TAG) {
      const tag = selectTagById.projector(tagState, { id: activeId });
      return {
        ...tag,
        type: WorkContextType.TAG,
        routerLink: `tag/${tag.id}`,
      };
    }
    if (activeType === WorkContextType.PROJECT) {
      const project = selectProjectById.projector(projectState, { id: activeId });
      return {
        ...project,
        icon: null,
        taskIds: project.taskIds || [],
        backlogTaskIds: project.backlogTaskIds || [],
        type: WorkContextType.PROJECT,
        routerLink: `project/${project.id}`,
      };
    }
    throw new Error(
      'Unable to select active work context: ' + activeType + ' ' + activeId,
    );
  },
);

export const initialContextState: WorkContextState = {
  activeId: TODAY_TAG.id,
  activeType: WorkContextType.TAG,
};

const _reducer = createReducer<WorkContextState>(
  initialContextState,

  on(contextActions.setActiveWorkContext, (oldState, { activeId, activeType }) => ({
    ...oldState,
    activeId,
    activeType,
  })),
  on(contextActions.loadWorkContextState, (oldState, { state }) => ({
    ...oldState,
    ...state,
  })),
);

export const workContextReducer = (
  state: WorkContextState = initialContextState,
  action: Action,
): WorkContextState => _reducer(state, action);
