import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { SimpleCounter } from '../simple-counter.model';

export const addSimpleCounter = createAction(
  '[SimpleCounter] Add SimpleCounter',
  props<{ simpleCounter: SimpleCounter }>(),
);

export const updateSimpleCounter = createAction(
  '[SimpleCounter] Update SimpleCounter',
  props<{ simpleCounter: Update<SimpleCounter> }>(),
);

export const upsertSimpleCounter = createAction(
  '[SimpleCounter] Upsert SimpleCounter',
  props<{ simpleCounter: SimpleCounter }>(),
);

export const deleteSimpleCounter = createAction(
  '[SimpleCounter] Delete SimpleCounter',
  props<{ id: string }>(),
);

export const deleteSimpleCounters = createAction(
  '[SimpleCounter] Delete multiple SimpleCounters',
  props<{ ids: string[] }>(),
);

export const updateAllSimpleCounters = createAction(
  '[SimpleCounter] Update all SimpleCounters',
  props<{ items: SimpleCounter[] }>(),
);

export const setSimpleCounterCounterToday = createAction(
  '[SimpleCounter] Set SimpleCounter Counter Today',
  props<{ id: string; newVal: number; today: string }>(),
);

export const setSimpleCounterCounterForDate = createAction(
  '[Simple Counter] Set SimpleCounter Counter For Date',
  props<{ id: string; date: string; newVal: number }>(),
);

export const increaseSimpleCounterCounterToday = createAction(
  '[SimpleCounter] Increase SimpleCounter Counter Today',
  props<{ id: string; increaseBy: number; today: string }>(),
);

export const decreaseSimpleCounterCounterToday = createAction(
  '[SimpleCounter] Decrease SimpleCounter Counter Today',
  props<{ id: string; decreaseBy: number; today: string }>(),
);

export const toggleSimpleCounterCounter = createAction(
  '[SimpleCounter] Toggle SimpleCounter Counter',
  props<{ id: string }>(),
);

export const turnOffAllSimpleCounterCounters = createAction(
  '[SimpleCounter] Turn off all simple counters',
);

export const setSimpleCounterCounterOff = createAction(
  '[SimpleCounter] Set SimpleCounter Counter Off',
  props<{ id: string }>(),
);

export const setSimpleCounterCounterOn = createAction(
  '[SimpleCounter] Set SimpleCounter Counter On',
  props<{ id: string }>(),
);
