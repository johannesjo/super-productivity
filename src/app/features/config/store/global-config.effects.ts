import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, tap, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { CONFIG_FEATURE_NAME } from './global-config.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { IS_ELECTRON, LanguageCode } from '../../../app.constants';
import { T } from '../../../t.const';
import { LanguageService } from '../../../core/language/language.service';
import { DateService } from 'src/app/core/date/date.service';
import { SnackService } from '../../../core/snack/snack.service';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { DEFAULT_GLOBAL_CONFIG } from '../default-global-config.const';
import { KeyboardConfig } from '../keyboard-config.model';
import { updateGlobalConfigSection } from './global-config.actions';
import { MiscConfig } from '../global-config.model';
import { hideSideNav, toggleSideNav } from '../../../core-ui/layout/store/layout.actions';

@Injectable()
export class GlobalConfigEffects {
  updateConfig$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateGlobalConfigSection),
        withLatestFrom(this._store),
        tap(([action, store]) =>
          this._saveToLs([action, store], {
            isSkipSyncModelChangeUpdate: !!action.isSkipLastActiveUpdate,
          }),
        ),
      ),
    { dispatch: false },
  );

  snackUpdate$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateGlobalConfigSection),
        tap(({ sectionKey, sectionCfg }) => {
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
      ),
    { dispatch: false },
  );

  updateGlobalShortcut$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateGlobalConfigSection),
        filter(({ sectionKey, sectionCfg }) => IS_ELECTRON && sectionKey === 'keyboard'),
        tap(({ sectionKey, sectionCfg }) => {
          const keyboardCfg: KeyboardConfig = sectionCfg as KeyboardConfig;
          window.ea.registerGlobalShortcuts(keyboardCfg);
        }),
      ),
    { dispatch: false },
  );

  registerGlobalShortcutInitially$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(loadAllData),
        filter(() => IS_ELECTRON),
        tap((action) => {
          const appDataComplete = action.appDataComplete;
          const keyboardCfg: KeyboardConfig = (
            appDataComplete.globalConfig || DEFAULT_GLOBAL_CONFIG
          ).keyboard;
          window.ea.registerGlobalShortcuts(keyboardCfg);
        }),
      ),
    { dispatch: false },
  );

  selectLanguageOnChange: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateGlobalConfigSection),
        filter(({ sectionKey, sectionCfg }) => sectionKey === 'lang'),
        // eslint-disable-next-line
        filter(({ sectionKey, sectionCfg }) => sectionCfg && (sectionCfg as any).lng),
        tap(({ sectionKey, sectionCfg }) => {
          // eslint-disable-next-line
          this._languageService.setLng((sectionCfg as any)['lng']);
        }),
      ),
    { dispatch: false },
  );

  selectLanguageOnLoad: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(loadAllData),
        tap(({ appDataComplete }) => {
          const cfg = appDataComplete.globalConfig || DEFAULT_GLOBAL_CONFIG;
          const lng = cfg && cfg.lang && cfg.lang.lng;
          this._languageService.setLng(lng as LanguageCode);
        }),
      ),
    { dispatch: false },
  );

  setStartOfNextDayDiffOnChange: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateGlobalConfigSection),
        filter(({ sectionKey, sectionCfg }) => sectionKey === 'misc'),
        // eslint-disable-next-line
        filter(
          ({ sectionKey, sectionCfg }) =>
            sectionCfg && !!(sectionCfg as MiscConfig).startOfNextDay,
        ),
        tap(({ sectionKey, sectionCfg }) => {
          // eslint-disable-next-line
          this._dateService.setStartOfNextDayDiff((sectionCfg as any)['startOfNextDay']);
        }),
      ),
    { dispatch: false },
  );

  setStartOfNextDayDiffOnLoad: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(loadAllData),
        tap(({ appDataComplete }) => {
          const cfg = appDataComplete.globalConfig || DEFAULT_GLOBAL_CONFIG;
          const startOfNextDay = cfg && cfg.misc && cfg.misc.startOfNextDay;
          this._dateService.setStartOfNextDayDiff(startOfNextDay);
        }),
      ),
    { dispatch: false },
  );

  toggleNavOnMinimalNavChange$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateGlobalConfigSection),
        filter(({ sectionKey, sectionCfg }) => sectionKey === 'misc'),
        // eslint-disable-next-line
        filter(
          ({ sectionKey, sectionCfg }) =>
            sectionCfg && 'isUseMinimalNav' in (sectionCfg as MiscConfig),
        ),
        tap(({ sectionKey, sectionCfg }) => {
          this._store.dispatch(hideSideNav());
          this._store.dispatch(toggleSideNav());
          window.dispatchEvent(new Event('resize'));
        }),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _persistenceService: PersistenceService,
    private _languageService: LanguageService,
    private _dateService: DateService,
    private _snackService: SnackService,
    private _store: Store<any>,
  ) {}

  private _saveToLs(
    [action, completeState]: [any, any],
    { isSkipSyncModelChangeUpdate } = { isSkipSyncModelChangeUpdate: false },
  ): void {
    const globalConfig = completeState[CONFIG_FEATURE_NAME];
    this._persistenceService.globalConfig.saveState(globalConfig, {
      isSyncModelChange: !isSkipSyncModelChangeUpdate,
    });
  }
}
