let _remote: any = null;
import * as remote from '@electron/remote';

export const getElectronRemoteModule = (): typeof remote | null => {
  // eslint-disable-next-line
  if (window['require']) {
    _remote = window.require('@electron/remote');
    return _remote;
  }
  return _remote;
};
