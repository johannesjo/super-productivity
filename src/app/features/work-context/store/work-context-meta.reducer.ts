import * as contextActions from './work-context.actions';
import {Action, createReducer, on} from '@ngrx/store';
import {TagState} from '../../tag/tag.model';
import {ProjectState} from '../../project/store/project.reducer';

type WorkContextMetaState = TagState | ProjectState;

const _reducer = createReducer<WorkContextMetaState>(
  null,

  on(contextActions.setActiveWorkContext, (oldState, {activeId, activeType}) => ({...oldState, activeId, activeType})),
  on(contextActions.loadWorkContextState, (oldState, {state}) => ({...oldState, ...state})),
);


export function workContextMetaReducer(
  state = null,
  action: Action,
): WorkContextMetaState {
  return _reducer(state, action);
}


