import { LocalMeta } from '../pfapi.model';
import { validateMetaBase } from './validate-meta-base';

export const validateLocalMeta = (local: LocalMeta): LocalMeta => {
  return validateMetaBase(local);
};
