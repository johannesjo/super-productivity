import * as ElectronRenderer from 'electron/renderer';

let _electron: any = null;
export const getElectron = (): typeof ElectronRenderer | null => {
  // tslint:disable-next-line
  if (window['require']) {
    _electron = window.require('electron');
    return _electron;
  }
  return _electron;
};
