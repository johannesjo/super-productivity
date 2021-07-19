import { Dictionary } from '@ngrx/entity';

export const createEmptyEntity = (): Dictionary<any> => {
  return {
    ids: [],
    entities: {},
  };
};
