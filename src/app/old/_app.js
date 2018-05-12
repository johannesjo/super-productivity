// reload right away if there is an update
function onUpdateReady() {
  console.log('RELOAD RIGHT AWAY');
  // force reload without cache
  const r = window.confirm('Super Productivity has been updated to a new version. Reload the page to refresh the cache?');

  if (r === true) {
    window.location.reload(true);
  }
}

window.applicationCache.addEventListener('updateready', onUpdateReady);
if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
  onUpdateReady();
}

// Electron stuff
// require ipcRenderer if available
//if (typeof require === 'function') {
//  window.isElectron = true;
//
//  const { ipcRenderer } = require('electron');
//  window.ipcRenderer = ipcRenderer;
//}

// app initialization
export default angular
  .module('superProductivity', [
    'ngAnimate',
    'ngAria',
    'ngResource',
    'ui.router',
    'ngMaterial',
    'ngMdIcons',
    'as.sortable',
    'angularMoment',
    'hc.marked',
    'mwl.calendar',
    'mdxUtil',
    'angularPromiseButtons'
  ]);