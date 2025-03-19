import { RemoteMeta } from '../pfapi.model';
import { InvalidMetaError } from '../errors/errors';

export const validateRemoteMeta = (remote: RemoteMeta): RemoteMeta => {
  if (!remote) {
    throw new InvalidMetaError('is not defined', remote);
  }
  if (typeof remote.lastUpdate !== 'number') {
    throw new InvalidMetaError('lastUpdate is not a number', remote);
  }
  if (typeof remote.revMap !== 'object') {
    throw new InvalidMetaError('revMap is not an object', remote);
  }
  if (typeof remote.revMap !== 'object') {
    throw new InvalidMetaError('revMap is not an object', remote);
  }
  return remote;
};
