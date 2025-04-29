import { MetaFileBase } from '../pfapi.model';
import { InvalidMetaError } from '../errors/errors';
import { validateRevMap } from './validate-rev-map';

export const validateMetaBase = <T extends MetaFileBase>(baseMeta: T): T => {
  if (!baseMeta) {
    throw new InvalidMetaError('is not defined', baseMeta);
  }
  if (typeof baseMeta.lastUpdate !== 'number') {
    throw new InvalidMetaError('lastUpdate is not a number', baseMeta);
  }
  validateRevMap(baseMeta.revMap);
  return baseMeta;
};
