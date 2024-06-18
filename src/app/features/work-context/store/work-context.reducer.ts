import { WorkContextState, WorkContextType } from '../work-context.model';
import { Action, createReducer, on } from '@ngrx/store';
import { TODAY_TAG } from '../../tag/tag.const';
import { loadWorkContextState, setActiveWorkContext } from './work-context.actions';

export const initialContextState: WorkContextState = {
  activeId: TODAY_TAG.id,
  activeType: WorkContextType.TAG,
};

const _reducer = createReducer<WorkContextState>(
  initialContextState,

  on(setActiveWorkContext, (oldState, { activeId, activeType }) => ({
    ...oldState,
    activeId,
    activeType,
  })),
  on(loadWorkContextState, (oldState, { state }) => ({
    ...oldState,
    ...state,
  })),
);

export const workContextReducer = (
  state: WorkContextState = initialContextState,
  action: Action,
): WorkContextState => _reducer(state, action);
