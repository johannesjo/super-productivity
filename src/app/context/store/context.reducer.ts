import * as contextActions from './context.actions';
import {ContextState} from '../context.model';
import {Action, createFeatureSelector, createReducer, createSelector, on} from '@ngrx/store';

export const CONTEXT_FEATURE_NAME = 'context';


export const selectContextFeatureState = createFeatureSelector<ContextState>(CONTEXT_FEATURE_NAME);
export const selectActiveContextId = createSelector(selectContextFeatureState, (state) => state.activeId);

export const initialContextState: ContextState = {
  activeId: null
};


const _reducer = createReducer<ContextState>(
  initialContextState,

  on(contextActions.setActiveContext, (oldState, {activeId}) => ({...oldState, activeId})),
  on(contextActions.loadContextState, (oldState, {state}) => ({...oldState, ...state})),
);


export function contextReducer(
  state = initialContextState,
  action: Action,
): ContextState {
  return _reducer(state, action);
}


