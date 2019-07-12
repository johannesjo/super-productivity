import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {filter, tap, withLatestFrom} from 'rxjs/operators';
import {GlobalConfigActionTypes, LoadGlobalConfig, UpdateGlobalConfigSection} from './global-config.actions';
import {Store} from '@ngrx/store';
import {CONFIG_FEATURE_NAME} from './global-config.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {SnackOpen} from '../../../core/snack/store/snack.actions';
import {ElectronService} from 'ngx-electron';
import {KeyboardConfig} from '../global-config.model';
import {IPC_REGISTER_GLOBAL_SHORTCUTS_EVENT} from '../../../../../electron/ipc-events.const';
import {IS_ELECTRON} from '../../../app.constants';
import {TranslateService} from '@ngx-translate/core';

@Injectable()
export class GlobalConfigEffects {
  @Effect({dispatch: false}) updateConfig$: any = this._actions$
    .pipe(
      ofType(
        GlobalConfigActionTypes.UpdateGlobalConfigSection,
      ),
      withLatestFrom(this._store),
      tap(this._saveToLs.bind(this))
    );

  @Effect({dispatch: false}) snackUpdate$: any = this._actions$
    .pipe(
      ofType(
        GlobalConfigActionTypes.UpdateGlobalConfigSection,
      ),
      tap((action: UpdateGlobalConfigSection) => {
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
        GlobalConfigActionTypes.UpdateGlobalConfigSection,
      ),
      filter((action: UpdateGlobalConfigSection) => IS_ELECTRON && action.payload.sectionKey === 'keyboard'),
      tap((action: UpdateGlobalConfigSection) => {
        const keyboardCfg: KeyboardConfig = action.payload.sectionCfg as KeyboardConfig;
        this._electronService.ipcRenderer.send(IPC_REGISTER_GLOBAL_SHORTCUTS_EVENT, keyboardCfg);
      }),
    );

  @Effect({dispatch: false}) registerGlobalShortcutInitially$: any = this._actions$
    .pipe(
      ofType(
        GlobalConfigActionTypes.LoadGlobalConfig,
      ),
      filter(() => IS_ELECTRON),
      tap((action: LoadGlobalConfig) => {
        const keyboardCfg: KeyboardConfig = action.payload.cfg.keyboard;
        this._electronService.ipcRenderer.send(IPC_REGISTER_GLOBAL_SHORTCUTS_EVENT, keyboardCfg);
      }),
    );

  @Effect({dispatch: false}) selectLanguageOnChange: any = this._actions$
    .pipe(
      ofType(
        GlobalConfigActionTypes.UpdateGlobalConfigSection,
      ),
      filter((action: UpdateGlobalConfigSection) => action.payload.sectionKey === 'lang'),
      filter((action: UpdateGlobalConfigSection) => action.payload.sectionCfg && action.payload.sectionCfg['lng']),
      tap((action: UpdateGlobalConfigSection) => {
        const lng = action.payload.sectionCfg['lng'];
        this._translationService.use(lng);
      })
    );

  @Effect({dispatch: false}) selectLanguageOnLoad: any = this._actions$
    .pipe(
      ofType(
        GlobalConfigActionTypes.LoadGlobalConfig,
      ),
      filter((action: LoadGlobalConfig) => action.payload.cfg && action.payload.cfg.lang && !!action.payload.cfg.lang.lng),
      tap((action: LoadGlobalConfig) => {
        const lng = action.payload.cfg.lang.lng;
        this._translationService.use(lng);
      })
    );

  constructor(
    private _actions$: Actions,
    private _persistenceService: PersistenceService,
    private _electronService: ElectronService,
    private _translationService: TranslateService,
    private _store: Store<any>
  ) {
  }

  private async _saveToLs([action, state]) {
    const isSkipLastActive = action.payload && action.payload.isSkipLastActive;
    if (!isSkipLastActive) {
      this._persistenceService.saveLastActive();
    }

    const globalConfig = state[CONFIG_FEATURE_NAME];
    await this._persistenceService.globalConfig.save(globalConfig);
  }
}
