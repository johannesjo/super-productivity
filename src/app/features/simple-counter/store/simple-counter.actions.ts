import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { SimpleCounter } from '../simple-counter.model';
import { PersistentActionMeta } from '../../../core/persistence/operation-log/persistent-action.interface';
import { OpType } from '../../../core/persistence/operation-log/operation.types';

export const addSimpleCounter = createAction(
  '[SimpleCounter] Add SimpleCounter',
  (counterProps: { simpleCounter: SimpleCounter }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityId: counterProps.simpleCounter.id,
      opType: OpType.Create,
    } satisfies PersistentActionMeta,
  }),
);

export const updateSimpleCounter = createAction(
  '[SimpleCounter] Update SimpleCounter',
  (counterProps: { simpleCounter: Update<SimpleCounter> }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityId: counterProps.simpleCounter.id as string,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

// Upsert is typically used for sync/import, so no persistence metadata
export const upsertSimpleCounter = createAction(
  '[SimpleCounter] Upsert SimpleCounter',
  props<{ simpleCounter: SimpleCounter }>(),
);

export const deleteSimpleCounter = createAction(
  '[SimpleCounter] Delete SimpleCounter',
  (counterProps: { id: string }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityId: counterProps.id,
      opType: OpType.Delete,
    } satisfies PersistentActionMeta,
  }),
);

export const deleteSimpleCounters = createAction(
  '[SimpleCounter] Delete multiple SimpleCounters',
  (counterProps: { ids: string[] }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityIds: counterProps.ids,
      opType: OpType.Delete,
      isBulk: true,
    } satisfies PersistentActionMeta,
  }),
);

// Bulk update is typically used for sync/import, so no persistence metadata
export const updateAllSimpleCounters = createAction(
  '[SimpleCounter] Update all SimpleCounters',
  props<{ items: SimpleCounter[] }>(),
);

export const setSimpleCounterCounterToday = createAction(
  '[SimpleCounter] Set SimpleCounter Counter Today',
  (counterProps: { id: string; newVal: number; today: string }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityId: counterProps.id,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const setSimpleCounterCounterForDate = createAction(
  '[Simple Counter] Set SimpleCounter Counter For Date',
  (counterProps: { id: string; date: string; newVal: number }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityId: counterProps.id,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const increaseSimpleCounterCounterToday = createAction(
  '[SimpleCounter] Increase SimpleCounter Counter Today',
  (counterProps: { id: string; increaseBy: number; today: string }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityId: counterProps.id,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const decreaseSimpleCounterCounterToday = createAction(
  '[SimpleCounter] Decrease SimpleCounter Counter Today',
  (counterProps: { id: string; decreaseBy: number; today: string }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityId: counterProps.id,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const toggleSimpleCounterCounter = createAction(
  '[SimpleCounter] Toggle SimpleCounter Counter',
  (counterProps: { id: string }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityId: counterProps.id,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

// Internal cleanup action - typically triggered automatically, no persistence
export const turnOffAllSimpleCounterCounters = createAction(
  '[SimpleCounter] Turn off all simple counters',
);

export const setSimpleCounterCounterOff = createAction(
  '[SimpleCounter] Set SimpleCounter Counter Off',
  (counterProps: { id: string }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityId: counterProps.id,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const setSimpleCounterCounterOn = createAction(
  '[SimpleCounter] Set SimpleCounter Counter On',
  (counterProps: { id: string }) => ({
    ...counterProps,
    meta: {
      isPersistent: true,
      entityType: 'SIMPLE_COUNTER',
      entityId: counterProps.id,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);
