let _electron: any = null;
export const getElectron = (): Electron.RendererInterface | null => {
  // tslint:disable-next-line
  if (window['require']) {
    _electron = window.require('electron');
    return _electron;
  }
  return _electron;
};
