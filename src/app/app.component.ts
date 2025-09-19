import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChromeExtensionInterfaceService } from './core/chrome-extension-interface/chrome-extension-interface.service';
import { ShortcutService } from './core-ui/shortcut/shortcut.service';
import { GlobalConfigService } from './features/config/global-config.service';
import { LayoutService } from './core-ui/layout/layout.service';
import { IPC } from '../../electron/shared-with-frontend/ipc-events.const';
import { SnackService } from './core/snack/snack.service';
import { IS_ELECTRON, LanguageCode } from './app.constants';
import { expandAnimation } from './ui/animations/expand.ani';
import { warpRouteAnimation } from './ui/animations/warp-route';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { fadeAnimation } from './ui/animations/fade.ani';
import { BannerService } from './core/banner/banner.service';
import { LS } from './core/persistence/storage-keys.const';
import { BannerId } from './core/banner/banner.model';
import { T } from './t.const';
import { GlobalThemeService } from './core/theme/global-theme.service';
import { UiHelperService } from './features/ui-helper/ui-helper.service';
import { LanguageService } from './core/language/language.service';
import { WorkContextService } from './features/work-context/work-context.service';
import { ImexViewService } from './imex/imex-meta/imex-view.service';
import { IS_ANDROID_WEB_VIEW } from './util/is-android-web-view';
import { isOnline$ } from './util/is-online';
import { SyncTriggerService } from './imex/sync/sync-trigger.service';
import { SyncWrapperService } from './imex/sync/sync-wrapper.service';
import { environment } from '../environments/environment';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { TrackingReminderService } from './features/tracking-reminder/tracking-reminder.service';
import { map, take } from 'rxjs/operators';
import { IS_MOBILE } from './util/is-mobile';
import { warpAnimation, warpInAnimation } from './ui/animations/warp.ani';
import { GlobalConfigState } from './features/config/global-config.model';
import { AddTaskBarComponent } from './features/tasks/add-task-bar/add-task-bar.component';
import { Dir } from '@angular/cdk/bidi';
import { MagicSideNavComponent } from './core-ui/magic-side-nav/magic-side-nav.component';
import { MainHeaderComponent } from './core-ui/main-header/main-header.component';
import { BannerComponent } from './core/banner/banner/banner.component';
import { GlobalProgressBarComponent } from './core-ui/global-progress-bar/global-progress-bar.component';
import { FocusModeOverlayComponent } from './features/focus-mode/focus-mode-overlay/focus-mode-overlay.component';
import { ShepherdComponent } from './features/shepherd/shepherd.component';
import { AsyncPipe, DOCUMENT } from '@angular/common';
import { RightPanelComponent } from './features/right-panel/right-panel.component';
import { selectIsOverlayShown } from './features/focus-mode/store/focus-mode.selectors';
import { Store } from '@ngrx/store';
import { PfapiService } from './pfapi/pfapi.service';
import { PersistenceLegacyService } from './core/persistence/persistence-legacy.service';
import { download } from './util/download';
import { PersistenceLocalService } from './core/persistence/persistence-local.service';
import { SyncStatus } from './pfapi/api';
import { LocalBackupService } from './imex/local-backup/local-backup.service';
import { DEFAULT_META_MODEL } from './pfapi/api/model-ctrl/meta-model-ctrl';
import { AppDataCompleteNew } from './pfapi/pfapi-config';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogPleaseRateComponent } from './features/dialog-please-rate/dialog-please-rate.component';
import { getDbDateStr } from './util/get-db-date-str';
import { PluginService } from './plugins/plugin.service';
import { MarkdownPasteService } from './features/tasks/markdown-paste.service';
import { TaskService } from './features/tasks/task.service';
import { IpcRendererEvent } from 'electron';
import { SyncSafetyBackupService } from './imex/sync/sync-safety-backup.service';
import { Log } from './core/log';
import { MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { DialogUnsplashPickerComponent } from './ui/dialog-unsplash-picker/dialog-unsplash-picker.component';
import { ProjectService } from './features/project/project.service';
import { TagService } from './features/tag/tag.service';
import { ContextMenuComponent } from './ui/context-menu/context-menu.component';
import { WorkContextThemeCfg } from './features/work-context/work-context.model';
import { isInputElement } from './util/dom-element';
import { MobileBottomNavComponent } from './core-ui/mobile-bottom-nav/mobile-bottom-nav.component';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const w = window as Window & { productivityTips?: string[][]; randomIndex?: number };
const productivityTip: string[] | undefined =
  w.productivityTips && w.randomIndex !== undefined
    ? w.productivityTips[w.randomIndex]
    : undefined;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    expandAnimation,
    warpRouteAnimation,
    fadeAnimation,
    warpAnimation,
    warpInAnimation,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AddTaskBarComponent,
    Dir,
    MagicSideNavComponent,
    MainHeaderComponent,
    BannerComponent,
    RightPanelComponent,
    RouterOutlet,
    GlobalProgressBarComponent,
    FocusModeOverlayComponent,
    ShepherdComponent,
    AsyncPipe,
    MatMenuItem,
    MatIcon,
    TranslatePipe,
    ContextMenuComponent,
    MobileBottomNavComponent,
  ],
})
export class AppComponent implements OnDestroy, AfterViewInit {
  private _translateService = inject(TranslateService);

  private _globalConfigService = inject(GlobalConfigService);
  private _shortcutService = inject(ShortcutService);
  private _bannerService = inject(BannerService);
  private _snackService = inject(SnackService);
  private _chromeExtensionInterfaceService = inject(ChromeExtensionInterfaceService);
  private _globalThemeService = inject(GlobalThemeService);
  private _uiHelperService = inject(UiHelperService);
  private _languageService = inject(LanguageService);
  private _startTrackingReminderService = inject(TrackingReminderService);
  private _activatedRoute = inject(ActivatedRoute);
  private _pfapiService = inject(PfapiService);
  private _persistenceLegacyService = inject(PersistenceLegacyService);
  private _persistenceLocalService = inject(PersistenceLocalService);
  private _localBackupService = inject(LocalBackupService);
  private _matDialog = inject(MatDialog);
  private _markdownPasteService = inject(MarkdownPasteService);
  private _taskService = inject(TaskService);
  private _pluginService = inject(PluginService);
  private _syncWrapperService = inject(SyncWrapperService);
  private _projectService = inject(ProjectService);
  private _tagService = inject(TagService);
  private _destroyRef = inject(DestroyRef);
  private _ngZone = inject(NgZone);
  private _document = inject(DOCUMENT, { optional: true });

  // needs to be imported for initialization
  private _syncSafetyBackupService = inject(SyncSafetyBackupService);

  readonly syncTriggerService = inject(SyncTriggerService);
  readonly imexMetaService = inject(ImexViewService);
  readonly workContextService = inject(WorkContextService);
  readonly layoutService = inject(LayoutService);
  readonly globalThemeService = inject(GlobalThemeService);
  readonly _store = inject(Store);
  readonly T = T;
  readonly isShowMobileButtonNav = this.layoutService.isShowMobileBottomNav;

  productivityTipTitle: string = productivityTip?.[0] || '';
  productivityTipText: string = productivityTip?.[1] || '';

  @ViewChild('routeWrapper', { read: ElementRef }) routeWrapper?: ElementRef<HTMLElement>;

  @HostBinding('@.disabled') get isDisableAnimations(): boolean {
    return this._isDisableAnimations();
  }

  private _isDisableAnimations = computed(() => {
    const misc = this._globalConfigService.misc();
    return misc?.isDisableAnimations ?? false;
  });

  isRTL: boolean = false;

  isShowUi$: Observable<boolean> = combineLatest([
    this.syncTriggerService.afterInitialSyncDoneAndDataLoadedInitially$,
    this.imexMetaService.isDataImportInProgress$,
  ]).pipe(
    map(
      ([afterInitialIsReady, isDataImportInProgress]) =>
        afterInitialIsReady && !isDataImportInProgress,
    ),
  );

  isShowFocusOverlay = toSignal(this._store.select(selectIsOverlayShown), {
    initialValue: false,
  });

  private readonly _activeWorkContextId = toSignal(
    this.workContextService.activeWorkContextId$,
    { initialValue: null },
  );

  private _subs: Subscription = new Subscription();
  private _intervalTimer?: NodeJS.Timeout;

  constructor() {
    this._languageService.setDefault(LanguageCode.en);
    this._languageService.setFromBrowserLngIfAutoSwitchLng();

    this._checkMigrationAndInitBackups();

    // Use effect to react to language RTL changes
    effect(() => {
      const val = this._languageService.isLangRTL();
      this.isRTL = val;
      document.dir = this.isRTL ? 'rtl' : 'ltr';
    });

    this._subs.add(
      this._activatedRoute.queryParams.subscribe((params) => {
        if (!!params.focusItem) {
          this._focusElement(params.focusItem);
        }
      }),
    );

    // init theme and body class handlers
    this._globalThemeService.init();

    // basically init
    this._requestPersistence();

    // deferred init
    window.setTimeout(async () => {
      this._startTrackingReminderService.init();
      this._checkAvailableStorage();
      // init offline banner in lack of a better place for it
      this._initOfflineBanner();

      const miscCfg = this._globalConfigService.misc();
      if (!miscCfg?.isDisableProductivityTips) {
        this._snackService.open({
          ico: 'lightbulb',
          config: {
            duration: 16000,
          },
          msg:
            '<strong>' +
            w.productivityTips![w.randomIndex!][0] +
            ':</strong> ' +
            w.productivityTips![w.randomIndex!][1],
          actionStr: T.G.DONT_SHOW_AGAIN,
          actionFn: () => {
            this._globalConfigService.updateSection('misc', {
              isDisableProductivityTips: true,
            });
          },
        });
      }

      const appStarts = +(localStorage.getItem(LS.APP_START_COUNT) || 0);
      const lastStartDay = localStorage.getItem(LS.APP_START_COUNT_LAST_START_DAY);
      const todayStr = getDbDateStr();
      if (appStarts === 32 || appStarts === 96) {
        this._matDialog.open(DialogPleaseRateComponent);
        localStorage.setItem(LS.APP_START_COUNT, (appStarts + 1).toString());
      }
      if (lastStartDay !== todayStr) {
        localStorage.setItem(LS.APP_START_COUNT, (appStarts + 1).toString());
        localStorage.setItem(LS.APP_START_COUNT_LAST_START_DAY, todayStr);
      }

      // Initialize plugin system
      try {
        // Wait for sync to complete before initializing plugins to avoid DB lock conflicts
        await this._syncWrapperService.afterCurrentSyncDoneOrSyncDisabled$
          .pipe(take(1))
          .toPromise();
        await this._pluginService.initializePlugins();
        Log.log('Plugin system initialized after sync completed');
      } catch (error) {
        Log.err('Failed to initialize plugin system:', error);
      }
    }, 1000);

    if (IS_ELECTRON) {
      window.ea.informAboutAppReady();

      // Initialize electron error handler in an effect
      effect(() => {
        window.ea.on(IPC.ERROR, (ev: IpcRendererEvent, ...args: unknown[]) => {
          const data = args[0] as {
            error: unknown;
            stack: unknown;
            errorStr: string | unknown;
          };
          const errMsg =
            typeof data.errorStr === 'string' ? data.errorStr : ' INVALID ERROR MSG :( ';

          this._snackService.open({
            msg: errMsg,
            type: 'ERROR',
          });
          Log.err(data);
        });
      });

      this._uiHelperService.initElectron();

      window.ea.on(IPC.TRANSFER_SETTINGS_REQUESTED, () => {
        window.ea.sendAppSettingsToElectron(
          this._globalConfigService.cfg() as GlobalConfigState,
        );
      });
    } else {
      // WEB VERSION
      window.addEventListener('beforeunload', (e) => {
        const gCfg = this._globalConfigService.cfg();
        if (!gCfg) {
          throw new Error();
        }
        if (gCfg.misc.isConfirmBeforeExit) {
          e.preventDefault();
          e.returnValue = '';
        }
      });

      if (!IS_ANDROID_WEB_VIEW) {
        this._chromeExtensionInterfaceService.init();
        this._initMultiInstanceWarning();
      }
    }
  }

  @HostListener('document:paste', ['$event']) onPaste(ev: ClipboardEvent): void {
    // Skip handling inside input elements
    const target = ev.target as HTMLElement;
    if (isInputElement(target)) return;

    const clipboardData = ev.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('text/plain');
    if (!pastedText) return;

    if (!this._markdownPasteService.isMarkdownTaskList(pastedText)) return;

    // Prevent default paste behavior
    ev.preventDefault();

    // Check if paste is happening on a task element
    let taskId: string | null = null;
    let taskTitle: string | null = null;
    let isSubTask = false;

    // Find task element by traversing up the DOM tree
    let element: HTMLElement | null = target;
    while (element && !element.id.startsWith('t-')) {
      element = element.parentElement;
    }

    if (element && element.id.startsWith('t-')) {
      // Extract task ID from DOM id (format: "t-{taskId}")
      taskId = element.id.substring(2);

      // Get task data to determine if it's a sub-task
      this._taskService.getByIdOnce$(taskId).subscribe((task) => {
        if (task) {
          taskTitle = task.title;
          isSubTask = !!task.parentId;
          this._markdownPasteService.handleMarkdownPaste(
            pastedText,
            taskId,
            taskTitle,
            isSubTask,
          );
        } else {
          // Fallback: handle as parent tasks if task not found
          this._markdownPasteService.handleMarkdownPaste(pastedText, null);
        }
      });
    } else {
      // Handle as parent tasks since no specific task context
      this._markdownPasteService.handleMarkdownPaste(pastedText, null);
    }
  }

  @HostListener('window:beforeinstallprompt', ['$event']) onBeforeInstallPrompt(
    e: BeforeInstallPromptEvent,
  ): void {
    if (IS_ELECTRON || localStorage.getItem(LS.WEB_APP_INSTALL)) {
      return;
    }

    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();

    window.setTimeout(
      () => {
        this._bannerService.open({
          id: BannerId.InstallWebApp,
          msg: T.APP.B_INSTALL.MSG,
          action: {
            label: T.APP.B_INSTALL.INSTALL,
            fn: () => {
              e.prompt();
            },
          },
          action2: {
            label: T.APP.B_INSTALL.IGNORE,
            fn: () => {
              localStorage.setItem(LS.WEB_APP_INSTALL, 'true');
            },
          },
        });
      },
      2 * 60 * 1000,
    );
  }

  getPage(outlet: RouterOutlet): string {
    return outlet.activatedRouteData.page || 'one';
  }

  getActiveWorkContextId(): string | null {
    return this._activeWorkContextId();
  }

  changeBackgroundFromUnsplash(): void {
    const dialogRef = this._matDialog.open(DialogUnsplashPickerComponent, {
      width: '900px',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Get current work context
        this.workContextService.activeWorkContext$
          .pipe(take(1))
          .subscribe((activeContext) => {
            if (!activeContext) {
              this._snackService.open({
                type: 'ERROR',
                msg: 'No active work context',
              });
              return;
            }

            // Extract the URL from the result object
            const backgroundUrl = result.url || result;
            const isDarkMode = this._globalThemeService.isDarkTheme();
            const contextKey: keyof WorkContextThemeCfg = isDarkMode
              ? 'backgroundImageDark'
              : 'backgroundImageLight';

            // Update the theme based on context type
            if (activeContext.type === 'PROJECT') {
              this._projectService.update(activeContext.id, {
                theme: {
                  ...(activeContext.theme || {}),
                  [contextKey]: backgroundUrl,
                },
              });
            } else if (activeContext.type === 'TAG') {
              this._tagService.updateTag(activeContext.id, {
                theme: {
                  ...(activeContext.theme || {}),
                  [contextKey]: backgroundUrl,
                },
              });
            }
          });
      }
    });
  }

  ngAfterViewInit(): void {
    this._ngZone.runOutsideAngular(() => {
      const doc = this._document!;
      // Handle global document events outside Angular to avoid change detection churn.
      // - dragover/drop: block the browser's default file-drop navigation.
      // - keydown: route shortcuts and only re-enter Angular when they matter.
      // Prevent the browser from treating file drops as navigation events
      const onDragOver = (ev: DragEvent): void => {
        ev.preventDefault();
      };

      // Ensure accidental file drops don’t replace the SPA with the dropped file
      const onDrop = (ev: DragEvent): void => {
        ev.preventDefault();
      };

      const onKeyDown = (ev: KeyboardEvent): void => {
        this._ngZone.run(() => {
          void this._shortcutService.handleKeyDown(ev);
        });
      };

      doc.addEventListener('dragover', onDragOver, { passive: false });
      doc.addEventListener('drop', onDrop, { passive: false });
      doc.addEventListener('keydown', onKeyDown);

      this._destroyRef.onDestroy(() => {
        doc.removeEventListener('dragover', onDragOver);
        doc.removeEventListener('drop', onDrop);
        doc.removeEventListener('keydown', onKeyDown);
      });
    });
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    if (this._intervalTimer) clearInterval(this._intervalTimer);
  }

  private async _checkMigrationAndInitBackups(): Promise<void> {
    const MIGRATED_VAL = 42;
    const lastLocalSyncModelChange =
      await this._persistenceLocalService.loadLastSyncModelChange();
    // CHECK AND DO MIGRATION
    // ---------------------
    if (
      typeof lastLocalSyncModelChange === 'number' &&
      lastLocalSyncModelChange > MIGRATED_VAL
    ) {
      // disable sync until reload
      this._pfapiService.pf.sync = () => Promise.resolve({ status: SyncStatus.InSync });
      this.imexMetaService.setDataImportInProgress(true);

      const legacyData = await this._persistenceLegacyService.loadComplete();
      Log.log({ legacyData: legacyData });

      alert(this._translateService.instant(T.MIGRATE.DETECTED_LEGACY));

      if (
        !IS_ANDROID_WEB_VIEW &&
        confirm(this._translateService.instant(T.MIGRATE.C_DOWNLOAD_BACKUP))
      ) {
        download('sp-legacy-backup.json', JSON.stringify(legacyData));
      }
      try {
        await this._pfapiService.importCompleteBackup(
          legacyData as unknown as AppDataCompleteNew,
          true,
          true,
        );
        this.imexMetaService.setDataImportInProgress(true);
        await this._persistenceLocalService.updateLastSyncModelChange(MIGRATED_VAL);

        alert(this._translateService.instant(T.MIGRATE.SUCCESS));

        if (IS_ELECTRON) {
          window.ea.relaunch();
          // if relaunch fails we hard close the app
          window.setTimeout(() => window.ea.exit(1234), 1000);
        }
        window.location.reload();
        // fallback
        window.setTimeout(
          () => alert(this._translateService.instant(T.MIGRATE.E_RESTART_FAILED)),
          2000,
        );
      } catch (error) {
        // prevent any interaction with the app on after failure
        this.imexMetaService.setDataImportInProgress(true);
        Log.err(error);

        try {
          alert(
            this._translateService.instant(T.MIGRATE.E_MIGRATION_FAILED) +
              '\n\n' +
              JSON.stringify(
                (error as { additionalLog?: Array<{ errors: unknown }> })
                  .additionalLog?.[0]?.errors,
              ),
          );
        } catch (e) {
          alert(
            this._translateService.instant(T.MIGRATE.E_MIGRATION_FAILED) +
              '\n\n' +
              error?.toString(),
          );
        }
        return;
      }
    } else {
      // if everything is normal, check for TMP stray backup
      await this._pfapiService.isCheckForStrayLocalTmpDBBackupAndImport();

      // if completely fresh instance check for local backups
      if (IS_ELECTRON || IS_ANDROID_WEB_VIEW) {
        const meta = await this._pfapiService.pf.metaModel.load();
        if (!meta || meta.lastUpdate === DEFAULT_META_MODEL.lastUpdate) {
          await this._localBackupService.askForFileStoreBackupIfAvailable();
        }
        // trigger backup init after
        this._localBackupService.init();
      }
    }
  }

  private _initMultiInstanceWarning(): void {
    const channel = new BroadcastChannel('superProductivityTab');
    let isOriginal = true;

    enum Msg {
      newTabOpened = 'newTabOpened',
      alreadyOpenElsewhere = 'alreadyOpenElsewhere',
    }

    channel.postMessage(Msg.newTabOpened);
    // note that listener is added after posting the message

    channel.addEventListener('message', (msg) => {
      if (msg.data === Msg.newTabOpened && isOriginal) {
        // message received from 2nd tab
        // reply to all new tabs that the website is already open
        channel.postMessage(Msg.alreadyOpenElsewhere);
      }
      if (msg.data === Msg.alreadyOpenElsewhere) {
        isOriginal = false;
        // message received from original tab
        // replace this with whatever logic you need
        // NOTE: translations not ready yet
        const t =
          'You are running multiple instances of Super Productivity (possibly over multiple tabs). This is not recommended and might lead to data loss!!';
        const t2 = 'Please close all other instances, before you continue!';
        // show in two dialogs to be sure the user didn't miss it
        alert(t);
        alert(t2);
      }
    });
  }

  private _initOfflineBanner(): void {
    isOnline$.subscribe((isOnlineIn) => {
      if (!isOnlineIn) {
        this._bannerService.open({
          id: BannerId.Offline,
          ico: 'cloud_off',
          msg: T.APP.B_OFFLINE,
        });
      } else {
        this._bannerService.dismissAll(BannerId.Offline);
      }
    });
  }

  private _requestPersistence(): void {
    if (navigator.storage) {
      // try to avoid data-loss
      Promise.all([navigator.storage.persisted()])
        .then(([persisted]) => {
          if (!persisted) {
            return navigator.storage.persist().then((granted) => {
              if (granted) {
                Log.log('Persistent store granted');
              }
              // NOTE: we never execute for android web view, because it is always true
              else if (!IS_ANDROID_WEB_VIEW) {
                const msg = T.GLOBAL_SNACK.PERSISTENCE_DISALLOWED;
                Log.warn('Persistence not allowed');
                this._snackService.open({ msg });
              }
            });
          } else {
            Log.log('Persistence already allowed');
            return;
          }
        })
        .catch((e) => {
          Log.log(e);
          const err = e && e.toString ? e.toString() : 'UNKNOWN';
          const msg = T.GLOBAL_SNACK.PERSISTENCE_ERROR;
          this._snackService.open({
            type: 'ERROR',
            msg,
            translateParams: {
              err,
            },
          });
        });
    }
  }

  private _checkAvailableStorage(): void {
    if (environment.production) {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(({ usage, quota }) => {
          const u = usage || 0;
          const q = quota || 0;

          const percentUsed = Math.round((u / q) * 100);
          const usageInMib = Math.round(u / (1024 * 1024));
          const quotaInMib = Math.round(q / (1024 * 1024));
          const details = `${usageInMib} out of ${quotaInMib} MiB used (${percentUsed}%)`;
          Log.log(details);
          if (quotaInMib - usageInMib <= 333) {
            alert(
              `There is only very little disk space available (${
                quotaInMib - usageInMib
              }mb). This might affect how the app is running.`,
            );
          }
        });
      }
    }
  }

  /**
   * since page load and animation time are not always equal
   * an interval seemed to feel the most responsive
   */
  private _focusElement(id: string): void {
    let counter = 0;
    this._intervalTimer = setInterval(() => {
      counter += 1;

      const el = document.getElementById(`t-${id}`);
      el?.focus();

      if (el && IS_MOBILE) {
        el.classList.add('mobile-highlight-searched-item');
        el.addEventListener('blur', () =>
          el.classList.remove('mobile-highlight-searched-item'),
        );
      }

      if ((el || counter === 4) && this._intervalTimer) {
        clearInterval(this._intervalTimer);
      }
    }, 400);
  }
}
