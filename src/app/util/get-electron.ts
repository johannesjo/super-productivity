import { Renderer } from 'electron';

let _electron: any = null;
export const getElectron = (): typeof Renderer | null => {
  // eslint-disable-next-line
  if (window['require']) {
    _electron = window.require('electron');
    return _electron;
  }
  return _electron;
};
