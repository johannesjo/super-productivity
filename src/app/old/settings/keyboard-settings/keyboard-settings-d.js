/**
 * @ngdoc directive
 * @name superProductivity.directive:keyboardSettings
 * @description
 * # keyboardSettings
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .directive('keyboardSettings', keyboardSettings);

  /* @ngInject */
  function keyboardSettings() {
    return {
      template: require('./keyboard-settings-d.html'),
      bindToController: true,
      controller: KeyboardSettingsCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        keys: '='
      }
    };
  }

  /* @ngInject */
  function KeyboardSettingsCtrl(IS_ELECTRON, LS_DEFAULTS) {
    let vm = this;
    const IPC_REGISTER_GLOBAL_SHORTCUT_EVENT = 'REGISTER_GLOBAL_SHORTCUT';

    vm.IS_ELECTRON = IS_ELECTRON;

    // shorcuts
    vm.registerGlobalShortcut = (globalShowHide) => {
      if (IS_ELECTRON) {
        // send to electron
        window.ipcRenderer.send(IPC_REGISTER_GLOBAL_SHORTCUT_EVENT, globalShowHide);
      }
    };

    vm.resetAllShortcuts = () => {
      vm.keys = LS_DEFAULTS.keys;
    };
  }

})();
