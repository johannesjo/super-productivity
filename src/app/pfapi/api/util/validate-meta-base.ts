import { MetaFileBase } from '../pfapi.model';
import { InvalidMetaError } from '../errors/errors';

export const validateMetaBase = <T extends MetaFileBase>(baseMeta: T): T => {
  if (!baseMeta) {
    throw new InvalidMetaError('is not defined', baseMeta);
  }
  if (typeof baseMeta.lastUpdate !== 'number') {
    throw new InvalidMetaError('lastUpdate is not a number', baseMeta);
  }
  if (typeof baseMeta.revMap !== 'object') {
    throw new InvalidMetaError('revMap is not an object', baseMeta);
  }
  if (typeof baseMeta.revMap !== 'object') {
    throw new InvalidMetaError('revMap is not an object', baseMeta);
  }
  return baseMeta;
};
