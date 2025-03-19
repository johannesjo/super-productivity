import { LocalMeta } from '../pfapi.model';
import { validateRemoteMeta } from './validate-remote-meta';

export const validateLocalMeta = (local: LocalMeta): LocalMeta => {
  return validateRemoteMeta(local);
};
