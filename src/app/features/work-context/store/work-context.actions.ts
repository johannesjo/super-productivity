import { createAction, props } from '@ngrx/store';
import { WorkContextState, WorkContextType } from '../work-context.model';

export const loadWorkContextState = createAction(
  '[WorkContext] Load Work Context State',
  props<{ state: WorkContextState }>(),
);

export const setActiveWorkContext = createAction(
  '[WorkContext] Set Active Work Context',
  props<{ activeId: string; activeType: WorkContextType }>(),
);
