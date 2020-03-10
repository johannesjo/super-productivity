import {createAction, props} from '@ngrx/store';
import {ContextState} from '../context.model';

export const loadContextState = createAction(
  '[Context] Load Context State',
  props<{ state: ContextState }>(),
);

export const setActiveContext = createAction(
  '[Context] Set Active Context',
  props<{ activeId: string }>(),
);

