import * as contextActions from './work-context.actions';
import {WorkContextState} from '../work-context.model';
import {Action, createFeatureSelector, createReducer, createSelector, on} from '@ngrx/store';

export const WORK_CONTEXT_FEATURE_NAME = 'context';


export const selectContextFeatureState = createFeatureSelector<WorkContextState>(WORK_CONTEXT_FEATURE_NAME);
export const selectActiveContextId = createSelector(selectContextFeatureState, (state) => state.activeId);

export const initialContextState: WorkContextState = {
  activeId: null,
  activeType: null
};


const _reducer = createReducer<WorkContextState>(
  initialContextState,

  on(contextActions.setActiveWorkContext, (oldState, {activeId, activeType}) => ({...oldState, activeId, activeType})),
  on(contextActions.loadWorkContextState, (oldState, {state}) => ({...oldState, ...state})),
);


export function workContextReducer(
  state = initialContextState,
  action: Action,
): WorkContextState {
  return _reducer(state, action);
}


