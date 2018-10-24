import { Injectable } from '@angular/core';
import { IS_ELECTRON } from '../../app.constants';
import { checkKeyCombo } from '../util/check-key-combo';
import { ConfigService } from '../config/config.service';

// const IPC_REGISTER_GLOBAL_SHORTCUT_EVENT = 'REGISTER_GLOBAL_SHORTCUT';

@Injectable({
  providedIn: 'root'
})
export class ShortcutService {

  constructor(private _configService: ConfigService) {
    //   // Register electron shortcut(s)
    //   if (IS_ELECTRON && this._configService.cfg.keyboard.globalShowHide) {
    //     window.ipcRenderer.send(IPC_REGISTER_GLOBAL_SHORTCUT_EVENT, $rootScope.r.keys.globalShowHide);
    //   }
  }

  handleKeyDown(ev: KeyboardEvent) {
    const cfg = this._configService.cfg;


    // if (checkKeyCombo(ev, cfg.keyboard.openProjectNotes)) {
    //   Dialogs('NOTES', undefined, true);
    // }
    // if (checkKeyCombo(ev, cfg.keyboard.openDistractionPanel)) {
    //   Dialogs('DISTRACTIONS', undefined, true);
    // }
    // if (checkKeyCombo(ev, cfg.keyboard.showHelp)) {
    //   Dialogs('HELP', {template: 'PAGE'}, true);
    // }
    //
    // if (checkKeyCombo(ev, cfg.keyboard.goToDailyPlanner)) {
    //   $state.go('daily-planner');
    // }
    // if (checkKeyCombo(ev, cfg.keyboard.goToWorkView)) {
    //   $state.go('work-view');
    // }
    // if (checkKeyCombo(ev, cfg.keyboard.goToDailyAgenda)) {
    //   $state.go('daily-agenda');
    // }
    // if (checkKeyCombo(ev, cfg.keyboard.goToSettings)) {
    //   $state.go('settings');
    // }
    // if (checkKeyCombo(ev, cfg.keyboard.goToFocusMode)) {
    //   $state.go('focus-view');
    // }

    // special hidden dev tools combo to use them for production
    if (IS_ELECTRON) {
      if (checkKeyCombo(ev, 'Ctrl+Shift+J')) {
        window.ipcRenderer.send('TOGGLE_DEV_TOOLS');
      }
    }
  }
}
