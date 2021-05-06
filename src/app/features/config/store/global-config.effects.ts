import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { filter, tap, withLatestFrom } from 'rxjs/operators';
import {
  GlobalConfigActionTypes,
  UpdateGlobalConfigSection,
} from './global-config.actions';
import { Store } from '@ngrx/store';
import { CONFIG_FEATURE_NAME } from './global-config.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { IPC } from '../../../../../electron/ipc-events.const';
import { IS_ELECTRON, LanguageCode } from '../../../app.constants';
import { T } from '../../../t.const';
import { LanguageService } from '../../../core/language/language.service';
import { SnackService } from '../../../core/snack/snack.service';
import { ElectronService } from '../../../core/electron/electron.service';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { DEFAULT_GLOBAL_CONFIG } from '../default-global-config.const';
import { ipcRenderer } from 'electron';
import { KeyboardConfig } from '../keyboard-config.model';

@Injectable()
export class GlobalConfigEffects {
  @Effect({ dispatch: false }) updateConfig$: any = this._actions$.pipe(
    ofType(GlobalConfigActionTypes.UpdateGlobalConfigSection),
    withLatestFrom(this._store),
    tap(this._saveToLs.bind(this)),
  );

  @Effect({ dispatch: false }) snackUpdate$: any = this._actions$.pipe(
    ofType(GlobalConfigActionTypes.UpdateGlobalConfigSection),
    tap((action: UpdateGlobalConfigSection) => {
      const { sectionKey, sectionCfg } = action.payload;
      const isPublicSection = sectionKey.charAt(0) !== '_';
      const isPublicPropUpdated = Object.keys(sectionCfg).find(
        (key) => key.charAt(0) !== '_',
      );
      if (isPublicPropUpdated && isPublicSection) {
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.CONFIG.S.UPDATE_SECTION,
          translateParams: { sectionKey },
        });
      }
    }),
  );

  @Effect({ dispatch: false }) updateGlobalShortcut$: any = this._actions$.pipe(
    ofType(GlobalConfigActionTypes.UpdateGlobalConfigSection),
    filter(
      (action: UpdateGlobalConfigSection) =>
        IS_ELECTRON && action.payload.sectionKey === 'keyboard',
    ),
    tap((action: UpdateGlobalConfigSection) => {
      const keyboardCfg: KeyboardConfig = action.payload.sectionCfg as KeyboardConfig;
      (this._electronService.ipcRenderer as typeof ipcRenderer).send(
        IPC.REGISTER_GLOBAL_SHORTCUTS_EVENT,
        keyboardCfg,
      );
    }),
  );

  @Effect({ dispatch: false })
  registerGlobalShortcutInitially$: any = this._actions$.pipe(
    ofType(loadAllData),
    filter(() => IS_ELECTRON),
    tap((action) => {
      const appDataComplete = action.appDataComplete;
      const keyboardCfg: KeyboardConfig = (
        appDataComplete.globalConfig || DEFAULT_GLOBAL_CONFIG
      ).keyboard;
      (this._electronService.ipcRenderer as typeof ipcRenderer).send(
        IPC.REGISTER_GLOBAL_SHORTCUTS_EVENT,
        keyboardCfg,
      );
    }),
  );

  @Effect({ dispatch: false }) selectLanguageOnChange: any = this._actions$.pipe(
    ofType(GlobalConfigActionTypes.UpdateGlobalConfigSection),
    filter((action: UpdateGlobalConfigSection) => action.payload.sectionKey === 'lang'),
    // eslint-disable-next-line
    filter(
      (action: UpdateGlobalConfigSection) =>
        action.payload.sectionCfg && (action.payload.sectionCfg as any).lng,
    ),
    tap((action: UpdateGlobalConfigSection) => {
      // eslint-disable-next-line
      this._languageService.setLng((action.payload.sectionCfg as any)['lng']);
    }),
  );

  @Effect({ dispatch: false }) selectLanguageOnLoad: any = this._actions$.pipe(
    ofType(loadAllData),
    tap((action) => {
      const cfg = action.appDataComplete.globalConfig || DEFAULT_GLOBAL_CONFIG;
      const lng = cfg && cfg.lang && cfg.lang.lng;
      this._languageService.setLng(lng as LanguageCode);
    }),
  );

  constructor(
    private _actions$: Actions,
    private _persistenceService: PersistenceService,
    private _electronService: ElectronService,
    private _languageService: LanguageService,
    private _snackService: SnackService,
    private _store: Store<any>,
  ) {}

  private async _saveToLs([action, completeState]: [any, any]) {
    const globalConfig = completeState[CONFIG_FEATURE_NAME];
    await this._persistenceService.globalConfig.saveState(globalConfig, {
      isSyncModelChange: true,
    });
  }
}
