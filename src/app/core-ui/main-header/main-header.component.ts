import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ProjectService } from '../../features/project/project.service';
import { LayoutService } from '../layout/layout.service';
import { TaskService } from '../../features/tasks/task.service';
import { T } from '../../t.const';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { filter, map, startWith, switchMap } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { expandFadeHorizontalAnimation } from '../../ui/animations/expand.ani';
import { SimpleCounterService } from '../../features/simple-counter/simple-counter.service';
import { SimpleCounter } from '../../features/simple-counter/simple-counter.model';
import { SyncWrapperService } from '../../imex/sync/sync-wrapper.service';
import { SnackService } from '../../core/snack/snack.service';
import { NavigationEnd, Router } from '@angular/router';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { KeyboardConfig, keyboardConfigOrEmpty } from '@sp/keyboard-config';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatBadge } from '@angular/material/badge';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuContent, MatMenuTrigger } from '@angular/material/menu';
import { PluginBridgeService } from '../../plugins/plugin-bridge.service';
import { TranslatePipe } from '@ngx-translate/core';
import { SimpleCounterButtonComponent } from '../../features/simple-counter/simple-counter-button/simple-counter-button.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { LongPressDirective } from '../../ui/longpress/longpress.directive';
import { isOnline$ } from '../../util/is-online';
import { Store } from '@ngrx/store';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';
import { showFocusOverlay } from '../../features/focus-mode/store/focus-mode.actions';
import { SyncStatus } from '../../op-log/sync-exports';
import { PluginHeaderBtnsComponent } from '../../plugins/ui/plugin-header-btns.component';
import { PluginWorkContextHeaderBtnsComponent } from '../../plugins/ui/plugin-work-context-header-btns.component';
import { PluginSidePanelBtnsComponent } from '../../plugins/ui/plugin-side-panel-btns.component';
import { PageTitleComponent } from './page-title/page-title.component';
import { PlayButtonComponent } from './play-button/play-button.component';
import { DesktopPanelButtonsComponent } from './desktop-panel-buttons/desktop-panel-buttons.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { MetricService } from '../../features/metric/metric.service';
import { DateService } from '../../core/date/date.service';
import { UserProfileButtonComponent } from '../../features/user-profile/user-profile-button/user-profile-button.component';
import { FocusButtonComponent } from './focus-button/focus-button.component';
import { UserProfileService } from '../../features/user-profile/user-profile.service';
import { EmlDropDirective } from '../../core/drop-paste-input/eml-drop.directive';
import { ConflictJournalService } from '../../op-log/sync/conflict-journal.service';

/**
 * Header actions that leave the bar when it runs out of room, in the order they
 * go. Everything not listed here is pinned and always stays visible.
 */
type DemotableHeaderItem =
  | 'pluginHeader'
  | 'userProfile'
  | 'panelButtons'
  | 'counters'
  | 'addTask';

const DEMOTION_ORDER: readonly DemotableHeaderItem[] = [
  'pluginHeader',
  'userProfile',
  'panelButtons',
  'counters',
  'addTask',
];

// The header is a fixed icon grid, so the fit can be computed instead of
// measured per button: every icon button is 40px
// (styles/components/_overwrite-material.scss), the play mini-fab is 48px, and
// counter buttons are 36px (`.counters-action-group` below).
const BTN_W = 40;
const PLAY_BTN_W = 48;
const COUNTER_BTN_W = 36;
const GAP_W = 4; // --s-half
/** Room kept for the page title and its own non-shrinkable action buttons. */
const TITLE_MIN_W = 128;
/** `.wrapper` horizontal padding — the desktop (larger) value, deliberately. */
const WRAPPER_PADDING_W = 32;

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, expandFadeHorizontalAnimation],
  imports: [
    MatIconButton,
    MatIcon,
    MatBadge,
    MatTooltip,
    MatMenu,
    MatMenuContent,
    MatMenuTrigger,
    NgTemplateOutlet,
    TranslatePipe,
    SimpleCounterButtonComponent,
    LongPressDirective,
    EmlDropDirective,
    PluginHeaderBtnsComponent,
    PluginWorkContextHeaderBtnsComponent,
    PluginSidePanelBtnsComponent,
    PageTitleComponent,
    PlayButtonComponent,
    DesktopPanelButtonsComponent,
    UserProfileButtonComponent,
    FocusButtonComponent,
  ],
})
export class MainHeaderComponent implements OnDestroy {
  private readonly _elRef = inject(ElementRef<HTMLElement>);
  private _teleportedNav: HTMLElement | null = null;
  private _teleportObserver: MutationObserver | null = null;
  readonly projectService = inject(ProjectService);
  readonly matDialog = inject(MatDialog);
  readonly workContextService = inject(WorkContextService);
  readonly taskService = inject(TaskService);
  readonly layoutService = inject(LayoutService);
  readonly simpleCounterService = inject(SimpleCounterService);
  readonly syncWrapperService = inject(SyncWrapperService);
  readonly globalConfigService = inject(GlobalConfigService);
  private readonly _snackService = inject(SnackService);
  private readonly _router = inject(Router);
  private readonly _store = inject(Store);
  private readonly _configService = inject(GlobalConfigService);
  private readonly _metricService = inject(MetricService);
  private readonly _dateService = inject(DateService);
  private readonly _dataInitStateService = inject(DataInitStateService);
  private readonly _conflictJournal = inject(ConflictJournalService);

  readonly isDataLoaded = toSignal(this._dataInitStateService.isAllDataLoadedInitially$, {
    initialValue: false,
  });

  // SPAP-15: persistent badge on the sync icon — count of unreviewed
  // auto-resolved sync conflicts awaiting review.
  readonly unreviewedConflictCount = this._conflictJournal.unreviewedCount;

  T: typeof T = T;

  isXs = this.layoutService.isXs;
  isXxxs = this.layoutService.isXxxs;

  // Add-task and the panel buttons are not "demoted" on small screens, they
  // *live somewhere else*: the bottom nav owns the add FAB and the panels menu.
  // That is a product placement rule, not a width one, so it stays keyed to the
  // bottom nav's presence rather than to the measured fit below.
  private readonly _isOwnedByBottomNav = this.layoutService.isShowMobileBottomNav;

  private _currentTaskContext$ = this.taskService.currentTaskParentOrCurrent$.pipe(
    filter((ct) => !!ct),
    switchMap((currentTask) =>
      this.workContextService.activeWorkContextId$.pipe(
        filter((activeWorkContextId) => !!activeWorkContextId),
        switchMap((activeWorkContextId) => {
          if (
            currentTask.projectId === activeWorkContextId ||
            currentTask.tagIds.includes(activeWorkContextId as string)
          ) {
            return of(null);
          }
          return currentTask.projectId
            ? this.projectService.getByIdOnce$(currentTask.projectId)
            : of(null);
        }),
      ),
    ),
  );

  currentTaskContext = toSignal(this._currentTaskContext$);

  private _isRouteWithSidePanel$ = this._router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => true), // Always true since right-panel is now global
    startWith(true), // Always true since right-panel is now global
  );
  isRouteWithSidePanel = toSignal(this._isRouteWithSidePanel$, { initialValue: true });

  // Convert more observables to signals

  currentTask = toSignal(this.taskService.currentTask$);
  currentTaskId = this.taskService.currentTaskId;
  enabledSimpleCounters = toSignal(this.simpleCounterService.enabledSimpleCounters$, {
    initialValue: [],
  });
  isShowIssuePanel = computed(() => this.layoutService.isShowIssuePanel());
  isShowNotes = computed(() => this.layoutService.isShowNotes());
  isShowScheduleDayPanel = computed(() => this.layoutService.isShowScheduleDayPanel());
  syncIsEnabledAndReady = toSignal(this.syncWrapperService.isEnabledAndReady$);
  syncState = toSignal(this.syncWrapperService.syncState$);
  isSyncInProgress = toSignal(this.syncWrapperService.isSyncInProgress$);
  hasNoPendingOps = toSignal(this.syncWrapperService.hasNoPendingOps$, {
    initialValue: false,
  });
  superSyncIsConfirmedInSync = toSignal(
    this.syncWrapperService.superSyncIsConfirmedInSync$,
    { initialValue: false },
  );
  focusModeConfig = toSignal(
    this.globalConfigService.cfg$.pipe(map((cfg) => cfg?.focusMode)),
  );
  isOnline = toSignal(isOnline$);
  // State-aware tooltip for the sync button: the icon alone (sync_problem /
  // wifi_off) signals a problem but never explains it. Surfacing the state in
  // the tooltip is the ambient counterpart to suppressing the transient
  // network snack on automatic syncs — a persistent problem stays discoverable
  // by glancing at / hovering the always-present header button.
  // Precedence mirrors the icon @if cascade in the template (disabled →
  // offline → error → syncing → in-sync); keep the two in sync.
  syncTooltip = computed(() => {
    if (!this.syncIsEnabledAndReady()) {
      return T.MH.TRIGGER_SYNC;
    }
    if (!this.isOnline()) {
      return T.MH.SYNC_STATE.OFFLINE;
    }
    if (this.syncState() === 'ERROR') {
      return T.MH.SYNC_STATE.ERROR;
    }
    if (this.isSyncInProgress()) {
      return T.MH.SYNC_STATE.SYNCING;
    }
    if (this.hasNoPendingOps()) {
      return T.MH.SYNC_STATE.IN_SYNC;
    }
    return T.MH.TRIGGER_SYNC;
  });
  focusSummaryToday = computed(() =>
    this._metricService.getFocusSummaryForDay(this._dateService.todayStr()),
  );
  readonly isTimeTrackingEnabled = computed(() => {
    return this.globalConfigService.appFeatures().isTimeTrackingEnabled;
  });
  readonly isFocusModeEnabled = computed(() => {
    return this.globalConfigService.appFeatures().isFocusModeEnabled;
  });
  // Keep the focus entry point visible on mobile too when the feature is enabled.
  // Otherwise Android users can only discover focus mode by rotating to a wider layout (#8157).
  readonly isFocusButtonVisible = computed(() => this.isFocusModeEnabled());
  readonly isSyncIconEnabled = computed(() => {
    return this.globalConfigService.appFeatures().isSyncIconEnabled;
  });

  // Check if there are any undone tasks that can be tracked
  private readonly _hasTrackableTasks$ = this.workContextService.undoneTasks$.pipe(
    map((tasks) => tasks.length > 0),
  );
  hasTrackableTasks = toSignal(this._hasTrackableTasks$, { initialValue: true });

  private readonly _userProfileService = inject(UserProfileService);
  isUserProfilesEnabled = computed(() => {
    return (
      this.globalConfigService.appFeatures().isEnableUserProfiles &&
      this._userProfileService.isInitialized()
    );
  });

  private _subs: Subscription = new Subscription();

  // Vertical action bar is desktop-only and opt-in via misc config.
  private readonly _isVerticalActionBar = computed(
    () => !this.isXs() && !!this.globalConfigService.misc()?.isVerticalActionBar,
  );

  // --- Overflow handling (#9480) ------------------------------------------
  // The header used to pick its button set from the *window* width (`isXs`),
  // but it is laid out inside `.main-content`, which the in-flow side nav and
  // the right panel both narrow. A landscape phone therefore rendered the full
  // desktop set into a row ~260px narrower than the window, and the surplus
  // buttons fell off the edge unreachably (nothing in the ancestor chain
  // scrolls horizontally). Measuring the header's own width fixes the landscape
  // case, the side-nav/right-panel cases and unbounded plugin buttons at once.
  private readonly _zone = inject(NgZone);
  private readonly _pluginBridge = inject(PluginBridgeService);
  private _resizeObserver: ResizeObserver | null = null;
  // Infinity until first measured, so nothing collapses on the first paint.
  private readonly _hostWidth = signal(Number.POSITIVE_INFINITY);

  private readonly _pinnedWidth = computed(
    () =>
      (this.isTimeTrackingEnabled() ? PLAY_BTN_W + GAP_W : 0) +
      (this.isFocusButtonVisible() ? BTN_W + GAP_W : 0) +
      (this.isSyncIconEnabled() ? BTN_W + GAP_W : 0),
  );

  private readonly _itemWidths = computed<Record<DemotableHeaderItem, number>>(() => {
    const af = this.globalConfigService.appFeatures();
    const ownedByBottomNav = this._isOwnedByBottomNav();
    const counterCount = this.enabledSimpleCounters().filter(
      (c) => !c.isHideButton,
    ).length;
    const panelCount =
      this._pluginBridge.sidePanelButtons().length +
      (af.isScheduleDayPanelEnabled ? 1 : 0) +
      (af.isIssuesPanelEnabled ? 1 : 0) +
      (af.isProjectNotesEnabled ? 1 : 0);
    return {
      pluginHeader:
        (this._pluginBridge.headerButtons().length +
          this._pluginBridge.workContextHeaderButtons().length) *
        (BTN_W + GAP_W),
      userProfile: this.isUserProfilesEnabled() ? BTN_W + GAP_W : 0,
      panelButtons: ownedByBottomNav ? 0 : panelCount * (BTN_W + GAP_W),
      counters: counterCount * (COUNTER_BTN_W + GAP_W),
      addTask: ownedByBottomNav ? 0 : BTN_W + GAP_W,
    };
  });

  /** Items that do not fit and are shown in the overflow menu instead. */
  readonly demotedItems = computed<ReadonlySet<DemotableHeaderItem>>(() => {
    const demoted = new Set<DemotableHeaderItem>();
    // The teleported vertical strip is a fixed-width column, not this row.
    if (this._isVerticalActionBar()) {
      return demoted;
    }
    const widths = this._itemWidths();
    const available = this._hostWidth() - TITLE_MIN_W - WRAPPER_PADDING_W;
    let used =
      this._pinnedWidth() + DEMOTION_ORDER.reduce((sum, id) => sum + widths[id], 0);
    if (used <= available) {
      return demoted;
    }
    // Once anything is demoted, the trigger button needs room of its own.
    used += BTN_W + GAP_W;
    for (const id of DEMOTION_ORDER) {
      if (used <= available) {
        break;
      }
      if (widths[id] === 0) {
        continue;
      }
      demoted.add(id);
      used -= widths[id];
    }
    return demoted;
  });

  readonly hasOverflow = computed(() => this.demotedItems().size > 0);

  /**
   * Test seam: Karma cannot resize a detached fixture, so the demotion logic is
   * exercised by feeding it the width a real layout would have produced.
   */
  setHostWidthForTesting(width: number): void {
    this._hostWidth.set(width);
  }

  readonly showAddTaskInline = computed(
    () => !this._isOwnedByBottomNav() && !this.demotedItems().has('addTask'),
  );
  readonly showCountersInline = computed(() => !this.demotedItems().has('counters'));
  readonly showPluginBtnsInline = computed(
    () => !this.demotedItems().has('pluginHeader'),
  );
  readonly showUserProfileInline = computed(
    () => this.isUserProfilesEnabled() && !this.demotedItems().has('userProfile'),
  );
  readonly showPanelBtnsInline = computed(
    () => !this._isOwnedByBottomNav() && !this.demotedItems().has('panelButtons'),
  );
  readonly isDemotedCounters = computed(() => this.demotedItems().has('counters'));
  readonly isDemotedPluginBtns = computed(() => this.demotedItems().has('pluginHeader'));
  readonly isDemotedUserProfile = computed(
    () => this.isUserProfilesEnabled() && this.demotedItems().has('userProfile'),
  );
  readonly isDemotedPanelBtns = computed(
    () => !this._isOwnedByBottomNav() && this.demotedItems().has('panelButtons'),
  );
  readonly isDemotedAddTask = computed(
    () => !this._isOwnedByBottomNav() && this.demotedItems().has('addTask'),
  );

  constructor() {
    // Teleport the action nav to document.body (and back) so the fixed
    // vertical strip escapes any ancestor containing-block
    // (transform/filter/contain) and reliably anchors to the viewport.
    // Reacts live to the config toggle and the desktop/mobile breakpoint;
    // also re-runs when data load fills in the nav's gated content (the nav
    // shell itself renders from first paint).
    effect(() => {
      const enabled = this._isVerticalActionBar();
      this.isDataLoaded();
      this._syncTeleport(enabled);
    });

    this._observeHostWidth();
  }

  /**
   * Track the width the header actually has, not the window's. Runs outside
   * Angular and coalesces per frame: drawer open/close animations fire a
   * resize entry every frame and each one would otherwise be a change
   * detection pass.
   */
  private _observeHostWidth(): void {
    const el = this._elRef.nativeElement as HTMLElement;
    if (typeof ResizeObserver === 'undefined' || !(el instanceof Element)) {
      return;
    }
    this._zone.runOutsideAngular(() => {
      let frame = 0;
      this._resizeObserver = new ResizeObserver((entries) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const width = entries[entries.length - 1]?.contentRect.width ?? 0;
          if (width > 0 && width !== this._hostWidth()) {
            this._zone.run(() => this._hostWidth.set(width));
          }
        });
      });
      this._resizeObserver.observe(el);
    });
  }

  private _syncTeleport(enabled: boolean): void {
    if (enabled) {
      if (this._teleportedNav?.isConnected) return;
      if (!this._teleportNav()) {
        this._teleportObserver?.disconnect();
        this._teleportObserver = new MutationObserver(() => {
          if (this._teleportNav()) this._teleportObserver?.disconnect();
        });
        this._teleportObserver.observe(this._elRef.nativeElement, {
          childList: true,
          subtree: true,
        });
      }
    } else {
      this._teleportObserver?.disconnect();
      this._teleportObserver = null;
      this._restoreNav();
    }
  }

  private _teleportNav(): boolean {
    if (this._teleportedNav?.isConnected) return true;
    this._teleportedNav = null;
    const nav = (this._elRef.nativeElement as HTMLElement).querySelector(
      'nav.action-nav-right',
    ) as HTMLElement | null;
    if (!nav) return false;
    nav.classList.add('action-nav-right--teleported');
    document.body.appendChild(nav);
    this._teleportedNav = nav;
    return true;
  }

  private _restoreNav(): void {
    const nav = this._teleportedNav;
    if (!nav) return;
    this._teleportedNav = null;
    nav.classList.remove('action-nav-right--teleported');
    const wrapper = (this._elRef.nativeElement as HTMLElement).querySelector('.wrapper');
    if (wrapper) {
      wrapper.appendChild(nav);
    } else {
      nav.remove();
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._teleportObserver?.disconnect();
    this._teleportedNav?.remove();
    this._teleportedNav = null;
  }

  trackById(i: number, item: SimpleCounter): string {
    return item.id;
  }

  sync(): void {
    this.syncWrapperService.sync(true).then((r) => {
      // Keep persistent recovery actions (for example USE_REMOTE Undo) visible;
      // routine sync-success feedback must not replace them.
      if (this._snackService.hasPendingPersistentAction()) {
        return;
      }
      if (
        r === SyncStatus.UpdateLocal ||
        r === SyncStatus.UpdateRemoteAll ||
        r === SyncStatus.UpdateRemote
      ) {
        this._snackService.open({ type: 'SUCCESS', msg: T.F.SYNC.S.SUCCESS_VIA_BUTTON });
      } else if (r === SyncStatus.InSync) {
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.SYNC.S.ALREADY_IN_SYNC,
        });
      }
    });
  }

  onSyncButtonClick(): void {
    const ready = !!this.syncIsEnabledAndReady();
    if (ready) {
      this.sync();
    } else {
      this.setupSync();
    }
  }

  private dialogSyncCfgRef: MatDialogRef<unknown> | null = null;

  async setupSync(): Promise<void> {
    // to prevent multiple dialogs on longpress from android
    if (this.dialogSyncCfgRef) {
      return;
    }
    const { DialogSyncCfgComponent } =
      await import('../../imex/sync/dialog-sync-cfg/dialog-sync-cfg.component');
    this.dialogSyncCfgRef = this.matDialog.open(DialogSyncCfgComponent);
    this._subs.add(
      this.dialogSyncCfgRef.afterClosed().subscribe(() => {
        this.dialogSyncCfgRef = null;
      }),
    );
  }

  enableFocusMode(): void {
    this._store.dispatch(showFocusOverlay());
  }

  get kb(): KeyboardConfig {
    return keyboardConfigOrEmpty(this._configService.cfg()?.keyboard as KeyboardConfig);
  }
}
