import { RevMap } from '../pfapi.model';
import { InvalidRevMapError } from '../errors/errors';

export const validateRevMap = (revMap: RevMap): RevMap => {
  if (typeof revMap !== 'object') {
    throw new InvalidRevMapError(revMap);
  }
  Object.keys(revMap).forEach((modelId) => {
    if (typeof revMap[modelId] !== 'string' || !revMap[modelId]) {
      throw new InvalidRevMapError(revMap);
    }
    if (revMap[modelId].includes('\"')) {
      throw new Error('" occurred ERR');
    }
  });
  return revMap;
};
