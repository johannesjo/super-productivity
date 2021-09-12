import { createReducer, on } from '@ngrx/store';
import * as IdleActions from './idle.actions';

export const IDLE_FEATURE_KEY = 'idle';

export interface IdleState {
  isIdle: boolean;
  idleTime: number;
}

export const initialIdleState: IdleState = {
  isIdle: false,
  idleTime: 0,
};

export const idleReducer = createReducer(
  initialIdleState,

  on(IdleActions.triggerIdle, (state, { idleTime }) => ({
    ...state,
    isIdle: true,
    idleTime,
  })),
  on(IdleActions.resetIdle, (state) => ({ ...state, isIdle: false, idleTime: 0 })),
  on(IdleActions.setIdleTime, (state, { idleTime }) => ({ ...state, idleTime })),
);
