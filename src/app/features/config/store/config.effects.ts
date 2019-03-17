import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { filter, tap, withLatestFrom } from 'rxjs/operators';
import { ConfigActionTypes, LoadConfig, UpdateConfigSection } from './config.actions';
import { Store } from '@ngrx/store';
import { CONFIG_FEATURE_NAME } from './config.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { SnackOpen } from '../../../core/snack/store/snack.actions';
import { ElectronService } from 'ngx-electron';
import { KeyboardConfig } from '../config.model';
import { IPC_REGISTER_GLOBAL_SHORTCUT_EVENT } from '../../../../../electron/ipc-events.const';
import { IS_ELECTRON } from '../../../app.constants';

@Injectable()
export class ConfigEffects {
  @Effect({dispatch: false}) updateConfig$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.UpdateConfigSection,
      ),
      withLatestFrom(this._store),
      tap(this._saveToLs.bind(this))
    );

  @Effect({dispatch: false}) snackUpdate$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.UpdateConfigSection,
      ),
      tap((action: UpdateConfigSection) => {
        const {sectionKey, sectionCfg} = action.payload;
        const isPublicSection = sectionKey.charAt(0) !== '_';
        const isPublicPropUpdated = Object.keys(sectionCfg).find((key) => key.charAt(0) !== '_');
        if (isPublicPropUpdated && isPublicSection) {
          this._store.dispatch(new SnackOpen({
            type: 'SUCCESS',
            msg: `Updated settings for <strong>${sectionKey}</strong>`,
          }));
        }
      })
    );

  @Effect({dispatch: false}) updateGlobalShortcut$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.UpdateConfigSection,
      ),
      filter((action: UpdateConfigSection) => IS_ELECTRON && action.payload.sectionKey === 'keyboard'),
      tap((action: UpdateConfigSection) => {
        const keyboardCfg: KeyboardConfig = action.payload.sectionCfg as KeyboardConfig;
        const globalShowHideKey = keyboardCfg.globalShowHide;
        this._electronService.ipcRenderer.send(IPC_REGISTER_GLOBAL_SHORTCUT_EVENT, globalShowHideKey);
      }),
    );

  @Effect({dispatch: false}) registerGlobalShortcutInitially$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.LoadConfig,
      ),
      filter(() => IS_ELECTRON),
      tap((action: LoadConfig) => {
        const keyboardCfg: KeyboardConfig = action.payload.cfg.keyboard;
        const globalShowHideKey = keyboardCfg.globalShowHide;
        this._electronService.ipcRenderer.send(IPC_REGISTER_GLOBAL_SHORTCUT_EVENT, globalShowHideKey);
      }),
    );

  constructor(
    private _actions$: Actions,
    private _persistenceService: PersistenceService,
    private _electronService: ElectronService,
    private _store: Store<any>
  ) {
  }

  private async _saveToLs([action, state]) {
    const isSkipLastActive = action.payload && action.payload.isSkipLastActive;
    if (!isSkipLastActive) {
      this._persistenceService.saveLastActive();
    }

    const globalConfig = state[CONFIG_FEATURE_NAME];
    await this._persistenceService.saveGlobalConfig(globalConfig);
  }
}
