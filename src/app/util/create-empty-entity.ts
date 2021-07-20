import { EntityState } from '@ngrx/entity';

interface EntityStateString extends EntityState<any> {
  ids: string[];
}

export const createEmptyEntity = (): EntityStateString => {
  return {
    ids: [],
    entities: {},
  };
};
