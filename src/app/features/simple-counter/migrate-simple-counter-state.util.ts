import { MODEL_VERSION_KEY } from '../../app.constants';
import { isMigrateModel } from '../../util/model-version';
import { SimpleCounter, SimpleCounterState } from './simple-counter.model';
import { Dictionary } from '@ngrx/entity';
import { MODEL_VERSION } from '../../core/model-version';

export const migrateSimpleCounterState = (
  simpleCounterState: SimpleCounterState,
): SimpleCounterState => {
  if (
    !isMigrateModel(simpleCounterState, MODEL_VERSION.SIMPLE_COUNTER, 'SimpleCounter')
  ) {
    return simpleCounterState;
  }

  const simpleCounterEntities: Dictionary<SimpleCounter> = {
    ...simpleCounterState.entities,
  };
  Object.keys(simpleCounterEntities).forEach((key) => {
    simpleCounterEntities[key] = _migrateSimpleCounterEntity(
      simpleCounterEntities[key] as SimpleCounter,
    );
  });

  // Update model version after all migrations ran successfully
  simpleCounterState[MODEL_VERSION_KEY] = MODEL_VERSION.SIMPLE_COUNTER;
  return {
    ...simpleCounterState,
    entities: simpleCounterEntities,
    [MODEL_VERSION_KEY]: MODEL_VERSION.SIMPLE_COUNTER,
  };
};

const _migrateSimpleCounterEntity = (simpleCounter: SimpleCounter): SimpleCounter => {
  if (!simpleCounter.hasOwnProperty('countOnDay')) {
    const cpy = { ...simpleCounter };
    const countOnDay = (cpy as any).totalCountOnDay || {};

    // delete unused
    delete (cpy as any).totalCountOnDay;
    delete (cpy as any).count;
    delete (cpy as any).isStartWhenTrackingTime;
    delete (cpy as any).isPauseWhenTimeTrackingIsPaused;

    return {
      ...cpy,
      countOnDay,
    };
  }

  return simpleCounter;
};
