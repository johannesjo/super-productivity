let _electron;
export const getElectron = (): Electron.RendererInterface => {
  if (!_electron) {
    if (window && window.require) {
      _electron = window.require('electron');
      return _electron;
    }
    return null;
  }
  return _electron;
};
