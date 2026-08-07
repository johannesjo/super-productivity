import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
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
import { NgTemplateOutlet } from '@angular/common';
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
 * Header actions that leave the bar for the overflow panel when it runs out of
 * room, in the order they go (first entry leaves first). A demotion always
 * takes a prefix of this list, so the whole state is one count.
 *
 * Everything not listed is pinned: the play button, the focus button and the
 * add-task button, which are the header's reason to exist.
 *
 * Add-task is pinned rather than demoted last. It is the primary quick-capture
 * entry point and there must always be one visible on the page: on mobile the
 * bottom nav's FAB is that copy, and where there is no bottom nav the header
 * button is the only one, so it must not end up behind another tap. Sync yields
 * instead. Sync carries state — a conflict badge and an error/offline
 * condition — but the trigger republishes both while sync is demoted
 * (`demotedSyncState`, `demotedConflictCount`), which a hidden add button has
 * no equivalent of.
 */
type DemotableId =
  | 'pluginHeader'
  | 'userProfile'
  | 'sidePanelBtns'
  | 'panelButtons'
  | 'counters'
  | 'sync';

const DEMOTION_ORDER: readonly DemotableId[] = [
  'pluginHeader',
  'userProfile',
  'sidePanelBtns',
  'panelButtons',
  'counters',
  'sync',
];

/** Sub-pixel slop, so a fractional layout width never reads as an overflow. */
const FIT_EPSILON = 1;

/**
 * How long a widening header has to hold still before every action is offered
 * back inline. Long enough to cover a drag's frame-by-frame growth, short
 * enough to read as immediate once the drag stops.
 */
const REOFFER_DELAY_MS = 120;

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, expandFadeHorizontalAnimation],
  imports: [
    NgTemplateOutlet,
    MatIconButton,
    MatIcon,
    MatBadge,
    MatTooltip,
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
  private readonly _pluginBridge = inject(PluginBridgeService);
  private _resizeObserver: ResizeObserver | null = null;
  private readonly _counterCount = computed(
    () => this.enabledSimpleCounters().filter((c) => !c.isHideButton).length,
  );

  /**
   * Which actions this configuration can offer at all, in demotion order.
   * Add-task, the panel buttons and the plugin side-panel buttons are absent on
   * mobile rather than demoted: the bottom nav owns them there (its FAB and its
   * panels menu), which is a placement rule, not a question of width.
   */
  private readonly _demotableIds = computed<readonly DemotableId[]>(
    () => {
      if (!this.isDataLoaded()) {
        return [];
      }
      const af = this.globalConfigService.appFeatures();
      const ownedByBottomNav = this._isOwnedByBottomNav();
      return DEMOTION_ORDER.filter((id) => {
        switch (id) {
          case 'pluginHeader':
            return (
              this._pluginBridge.headerButtons().length > 0 ||
              this._pluginBridge.workContextHeaderButtons().length > 0
            );
          case 'userProfile':
            return this.isUserProfilesEnabled();
          case 'sidePanelBtns':
            return !ownedByBottomNav && this._pluginBridge.sidePanelButtons().length > 0;
          case 'panelButtons':
            return (
              !ownedByBottomNav &&
              (af.isScheduleDayPanelEnabled ||
                af.isIssuesPanelEnabled ||
                af.isProjectNotesEnabled)
            );
          case 'counters':
            return this._counterCount() > 0;
          case 'sync':
            return this.isSyncIconEnabled();
        }
      });
    },
    // Compare by contents, not identity. This computed rebuilds its array
    // whenever any source signal so much as re-emits — the counters observable
    // pushes a fresh array every tick while one is running — and the reflow
    // restarts whenever this changes. Without value equality that is a restart
    // every second, each one re-measuring and re-scheduling for nothing.
    {
      equal: (a, b) => a.length === b.length && a.every((id, i) => id === b[i]),
    },
  );

  /**
   * How much the row holds, as opposed to which slots it holds.
   *
   * `_demotableIds` compares by id, so a second simple counter, a third plugin
   * button or time tracking being switched off leaves it identical — while each
   * one changes how wide the row wants to be. The host's own width does not
   * change either, so the ResizeObserver never fires. Without this the fit is
   * simply never re-run for the case the reporter says gets worse "with every
   * enabled simple counter" (#9480).
   *
   * A joined string rather than an array, so signal equality settles it: the
   * counters observable re-emits every second while one is running, and only a
   * changed *number* may restart the fit.
   */
  private readonly _rowContentSize = computed(() =>
    [
      this._counterCount(),
      this._pluginBridge.headerButtons().length,
      this._pluginBridge.workContextHeaderButtons().length,
      this._pluginBridge.sidePanelButtons().length,
      this.isTimeTrackingEnabled() ? 1 : 0,
      this.isFocusButtonVisible() ? 1 : 0,
    ].join('/'),
  );

  /** How many leading `_demotableIds` are in the overflow panel. */
  private readonly _demotedCount = signal(0);

  /**
   * Whether the row has to fall back to scrolling — everything demotable has
   * gone and the pinned actions still do not fit.
   *
   * Kept as state rather than left permanently on, because scrolling means
   * clipping and this row has ink outside its buttons that must not be clipped
   * in the ordinary case: most visibly `.current-task-title`, the pill naming
   * the tracked task, which `play-button` hangs off the play button at
   * `right: 100%` — i.e. entirely beyond the inline-start clip edge, in a
   * direction `scrollLeft` cannot reach. An always-on floor deleted it.
   */
  readonly needsScrollFloor = signal(false);

  private _rafId = 0;
  private _reofferTimeout: ReturnType<typeof setTimeout> | undefined;
  /** Frames spent settling since the last real change; see `_restartReflow`. */
  private _passes = 0;

  private readonly _demoted = computed<ReadonlySet<DemotableId>>(() => {
    // The teleported vertical strip is a fixed-width column, not this row.
    if (this._isVerticalActionBar()) {
      return new Set<DemotableId>();
    }
    return new Set(this._demotableIds().slice(0, this._demotedCount()));
  });

  readonly hasOverflow = computed(() => this._demoted().size > 0);

  readonly isDemotedPluginBtns = computed(() => this._demoted().has('pluginHeader'));
  readonly isDemotedUserProfile = computed(() => this._demoted().has('userProfile'));
  readonly isDemotedSidePanelBtns = computed(() => this._demoted().has('sidePanelBtns'));
  readonly isDemotedPanelBtns = computed(() => this._demoted().has('panelButtons'));
  readonly isDemotedCounters = computed(() => this._demoted().has('counters'));
  readonly isDemotedSync = computed(() => this._demoted().has('sync'));

  /**
   * Which slots this configuration has anything to show at all.
   *
   * The same question `_demotableIds` already answers, asked once instead of
   * restated per slot. Restating it drifted: every `show*Inline` below used to
   * carry its own weaker predicate, so a slot with nothing in it still rendered
   * its `[data-slot]` wrapper — and the wrapper is a real flex box (it has to
   * be, to be measurable), so each empty one still spent a
   * `--header-nav-button-gap` of the width this whole change exists to win. A
   * default install paid that for plugin buttons and side-panel buttons, and
   * the always-present counters wrapper also stopped
   * `.header-action-group:empty` from ever matching its group.
   */
  private readonly _available = computed(() => new Set(this._demotableIds()));

  readonly showPluginBtnsInline = computed(
    () => this._available().has('pluginHeader') && !this.isDemotedPluginBtns(),
  );
  readonly showUserProfileInline = computed(
    () => this._available().has('userProfile') && !this.isDemotedUserProfile(),
  );
  readonly showSidePanelBtnsInline = computed(
    () => this._available().has('sidePanelBtns') && !this.isDemotedSidePanelBtns(),
  );
  readonly showPanelBtnsInline = computed(
    () => this._available().has('panelButtons') && !this.isDemotedPanelBtns(),
  );
  readonly showCountersInline = computed(
    () => this._available().has('counters') && !this.isDemotedCounters(),
  );
  readonly showSyncInline = computed(
    () => this._available().has('sync') && !this.isDemotedSync(),
  );
  // Pinned, and not gated on isDataLoaded: the shell paints before hydration
  // and the quick-capture entry point must already be there (#9420). Off the
  // demotion list entirely — where the bottom nav is not carrying its FAB, this
  // is the only add button on the page.
  readonly showAddTaskInline = computed(() => !this._isOwnedByBottomNav());

  readonly isOverflowOpen = signal(false);

  toggleOverflow(): void {
    this.isOverflowOpen.update((v) => !v);
  }

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

    // Widening the header empties the overflow panel and removes its trigger,
    // but the open flag would survive — so the panel would spring open by
    // itself the next time the header narrowed.
    effect(() => {
      if (!this.hasOverflow()) {
        this.isOverflowOpen.set(false);
      }
    });

    // Anything that changes which actions exist restarts the fit from scratch:
    // data arriving, a plugin registering a button, a panel feature toggled,
    // switching to or from the mobile bottom nav — and anything that changes
    // how much room they take without changing the set.
    effect(() => {
      this._demotableIds();
      this._rowContentSize();
      this._restartReflow();
    });

    this._listenForDismissal();
    this._observeHostWidth();
  }

  /**
   * Re-fit on an animation frame, never inside change detection.
   *
   * The reflow writes `_demotedCount`, which re-renders the bar. Doing that from
   * an `afterRender` hook makes every pass dirty the view from inside the render
   * phase, and Angular stops the application with NG0103 ("infinite change
   * detection") rather than trying to decide whether the sequence converges.
   * Measuring on a frame instead puts the write outside the cycle entirely, and
   * costs nothing: the browser has already laid out by then, so the reads are
   * still free.
   *
   * `_passes` bounds it independently of that. The demotion is monotone within
   * a settle, so it provably terminates — but "I proved it converges" is exactly
   * the reasoning that has been wrong repeatedly here, so the budget stays as a
   * backstop that makes a mistake cost one settled frame instead of a hung app.
   *
   * @param fromScratch re-offer every action inline and re-derive the whole
   * count from one measurement, instead of only demoting further from where it
   * currently stands. Widening is the case that needs it: `_demotedCount` is a
   * prefix count, so the only way it can come *down* is to recompute it.
   *
   * It is also the expensive direction, which is why `_observeHostWidth` only
   * asks for it once a resize has settled. Re-offering destroys every demoted
   * component and rebuilds it inline — including `simple-counter-button`, whose
   * countdown subscription is the whole reason the panel holds live components
   * instead of `mat-menu` rows. Run per frame of a side-nav or divider drag,
   * that tears down and rebuilds the same components dozens of times, restarts
   * their countdown pipelines and can re-fire a completion banner. Narrowing
   * stays immediate: demoting further is cheap, and it is the direction where
   * being late shows.
   */
  private _restartReflow(fromScratch = true): void {
    this._passes = 0;
    if (fromScratch) {
      this._demotedCount.set(0);
    }
    this._scheduleReflow();
  }

  private _scheduleReflow(): void {
    if (this._rafId || typeof requestAnimationFrame === 'undefined') {
      return;
    }
    this._rafId = requestAnimationFrame(() => {
      this._rafId = 0;
      this._reflow();
    });
  }

  /**
   * Decide the row by measuring it, not by predicting it.
   *
   * Every earlier attempt at this mirrored pixel constants from four other
   * stylesheets — button sizes, gaps, the title's action buttons and the
   * breakpoints that hide them — and each of the three bugs #9480 went through
   * was one of those constants disagreeing with the CSS it copied. So ask the
   * layout instead: `.page-title` carries its own `min-width`, and the row has
   * overflowed exactly when the nav no longer fits beside that minimum.
   *
   * Moves one action per frame and schedules the next, so it settles in at most
   * one frame per demotable action. Never iterates here: each step has to be
   * re-measured against a real layout, not a predicted one.
   */
  private _reflow(): void {
    const host = this._elRef.nativeElement as HTMLElement;
    const wrapper = host?.querySelector?.('.wrapper') as HTMLElement | null;
    // A teleported nav is a fixed-width column, and a `display: none` header
    // measures 0 — in both cases there is nothing meaningful to fit.
    if (!wrapper || this._isVerticalActionBar() || !wrapper.clientWidth) {
      return;
    }
    // One frame per demotable action is enough to settle, plus slack for the
    // trigger appearing and disappearing. Past that, stop and leave the row as
    // it stands rather than trading frames forever.
    if (this._passes++ > DEMOTION_ORDER.length + 2) {
      return;
    }
    const nav = wrapper.querySelector('nav.action-nav-right') as HTMLElement | null;
    if (!nav) {
      return;
    }

    // Slack: what the row has, less what it owes. Every term is measured except
    // the title's floor, which is a `min-width` in page-title.component — the
    // stylesheet that owns the title also owns how much of it must survive.
    //
    // Compare the content box against its occupants rather than looking at
    // edges. Two nearer-looking measures are both wrong here: the *wrapper's*
    // `scrollWidth` reports nothing, because the wrapper is `overflow: visible`
    // and so establishes no scroll container even while the row runs off the
    // edge; and the gap between the nav and the content edge is always ~0,
    // because the nav is pushed flush right and the leftover space collapses
    // into an auto margin. Slack that sits in an auto margin is only visible by
    // subtraction.
    //
    // An earlier version measured only how much further `.page-title` could
    // shrink, which made demotion a one-way ratchet: a short context name sits
    // at its min-width already, so there was never any slack to report, one
    // transient overflow during the first paint demoted an action, and nothing
    // could bring it back — the header ended up collapsed at every width.
    const style = getComputedStyle(wrapper);
    const contentW =
      wrapper.clientWidth -
      (parseFloat(style.paddingLeft) || 0) -
      (parseFloat(style.paddingRight) || 0);
    const title = wrapper.querySelector('.page-title') as HTMLElement | null;
    const titleMinW = title ? parseFloat(getComputedStyle(title).minWidth) || 0 : 0;
    // The title's own action buttons do not shrink either, so they are owed in
    // full — measured, because which of them render varies by breakpoint.
    const titleActions = wrapper.querySelector(
      '.page-title-actions',
    ) as HTMLElement | null;
    const titleActionsW = titleActions ? titleActions.getBoundingClientRect().width : 0;
    const free = contentW - this._intrinsicNavWidth(nav) - titleMinW - titleActionsW;

    const ids = this._demotableIds();
    const count = Math.min(this._demotedCount(), ids.length);
    if (count !== this._demotedCount()) {
      this._demotedCount.set(count);
      this._scheduleReflow();
      return;
    }

    if (free >= -FIT_EPSILON) {
      this.needsScrollFloor.set(false);
      return;
    }
    if (count >= ids.length) {
      // Over-wide with nothing left to demote: exactly the state the floor is
      // for. Turning it on adds the bleed padding, which only makes the row
      // measure wider still, so this cannot flip back and forth.
      this.needsScrollFloor.set(true);
      return;
    }

    // Everything still inline is measurable right now, so decide the whole
    // demotion in this one pass rather than moving one action per frame and
    // re-measuring. That is what lets the remembered-width cache go: the only
    // direction that ever needed remembering was the way back, and widening now
    // re-derives the count from zero instead of costing a restore against a
    // width recorded some frames ago. It also makes the settle monotone —
    // `count` only rises within one — so termination stops being an argument.
    const widths = new Map<string, number>();
    for (const el of Array.from(nav.querySelectorAll<HTMLElement>('[data-slot]'))) {
      widths.set(el.dataset.slot as string, el.getBoundingClientRect().width);
    }
    // Demoting the first action also introduces the trigger, so that pass has
    // to reclaim the deficit *plus* the trigger's own width.
    const trigger = nav.querySelector('.header-overflow-btn') as HTMLElement | null;
    const triggerW = trigger
      ? trigger.getBoundingClientRect().width
      : this._estimatedTriggerWidth(nav);
    const triggerCost = count === 0 ? triggerW : 0;

    let reclaimed = 0;
    let next = count;
    while (reclaimed < -free + triggerCost && next < ids.length) {
      reclaimed += widths.get(ids[next]) ?? 0;
      next++;
    }

    // Only worth doing if it actually frees width. Every header action is a
    // 40px icon button and so is the trigger, so "remove one button, add one
    // button, gain nothing" is reachable rather than a rounding concern: on a
    // phone the bottom nav owns add-task, the panel buttons and the side-panel
    // buttons, so a default install with no plugins, no profiles and no
    // counters has exactly ONE demotable — sync. Demoting it would reclaim zero
    // pixels, leave the row still overflowing, and hide the app's only
    // persistent sync indicator behind a tap.
    if (next > count && reclaimed - triggerCost > FIT_EPSILON) {
      this._demotedCount.set(next);
      this._scheduleReflow();
    } else {
      // Demoting more would free nothing, so the row stays over-wide and the
      // floor is the only thing left that keeps the buttons reachable.
      this.needsScrollFloor.set(true);
    }
  }

  /**
   * How wide the row wants to be — the question `_reflow` is actually asking,
   * and the one measurement here that must not depend on how the row is
   * currently laid out.
   *
   * Neither obvious reading survives on its own. The nav's rect is clamped by
   * `flex-shrink`, so it always "fits" and would report slack that does not
   * exist. `nav.scrollWidth` reports the overflow only while the nav is a
   * scroll container — which it is only while the scroll floor is engaged, so
   * reading it alone made the fit model silently blind in exactly the state
   * that has to decide whether to engage the floor at all.
   *
   * The children are the stable answer: they never shrink (`flex-shrink: 0`),
   * so the span from the leftmost to the rightmost is what the row is asking
   * for in every state — while scrolled, while clamped, in LTR and in RTL.
   * Zero-area children (an unpopulated slot, or anything `display: contents`)
   * are skipped rather than dragging the span to the viewport origin.
   */
  private _intrinsicNavWidth(nav: HTMLElement): number {
    let left = Infinity;
    let right = -Infinity;
    for (const kid of Array.from(nav.children)) {
      const r = kid.getBoundingClientRect();
      if (!r.width && !r.height) {
        continue;
      }
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
    }
    // `scrollWidth` still counts, because it is the one that includes the nav's
    // own padding — the bleed the floor adds.
    return Math.max(nav.scrollWidth, right > left ? right - left : 0);
  }

  /**
   * What the overflow trigger will cost before one has ever been rendered, so
   * the very first demotion can still tell a worthwhile trade from a pointless
   * one. Read from `--header-button-size`, the token every header action is
   * sized by, rather than restated as a number here — same reason the title's
   * floor is read back out of its own stylesheet. Superseded by the measured
   * width as soon as a trigger exists.
   */
  private _estimatedTriggerWidth(nav: HTMLElement): number {
    const size = getComputedStyle(nav).getPropertyValue('--header-button-size');
    return parseFloat(size) || 0;
  }

  /**
   * Re-run the fit whenever the header's own width changes — not the window's.
   * The header sits inside `.main-content`, which the in-flow side nav and the
   * right panel both narrow, so the window is the wrong thing to watch (#9480).
   *
   * Observes the host, whose width is set by its parent, so a demotion cannot
   * feed back into this callback and loop. No zone or rAF plumbing: the app is
   * zoneless, and ResizeObserver delivers at most one entry per frame per
   * target. Comparing the width keeps height-only resizes (the mobile keyboard)
   * from scheduling any work, and `contentRect` is a snapshot, so it forces no
   * layout.
   */
  private _observeHostWidth(): void {
    const el = this._elRef.nativeElement as HTMLElement;
    if (typeof ResizeObserver === 'undefined' || !(el instanceof Element)) {
      return;
    }
    let lastWidth = -1;
    this._resizeObserver = new ResizeObserver((entries) => {
      const width = entries[entries.length - 1]?.contentRect.width ?? 0;
      // A percentage-sized panel makes the header width fractional, so compare
      // with a pixel of slop rather than exactly: sub-pixel jitter must not
      // restart anything.
      if (width <= 0 || Math.abs(width - lastWidth) < 1) {
        return;
      }
      const widened = width > lastWidth;
      const isFirst = lastWidth < 0;
      lastWidth = width;
      // Narrowing demotes further from where it is, immediately. Widening has
      // to re-derive the count from zero, which is the costly direction (see
      // `_restartReflow`), so it waits for the resize to stop rather than
      // paying that per frame of a drag. The first delivery is not a resize —
      // it is the initial fit, and delaying it would show the unfitted row.
      if (isFirst) {
        this._restartReflow(true);
      } else if (widened) {
        this._scheduleReoffer();
      } else {
        this._restartReflow(false);
      }
    });
    this._resizeObserver.observe(el);
  }

  /**
   * Re-offer every action once the header has stopped growing. Each new
   * widening pushes the moment out, so a drag pays for one re-offer at the end
   * instead of one per frame.
   */
  private _scheduleReoffer(): void {
    if (this._reofferTimeout !== undefined) {
      clearTimeout(this._reofferTimeout);
    }
    this._reofferTimeout = setTimeout(() => {
      this._reofferTimeout = undefined;
      this._restartReflow(true);
    }, REOFFER_DELAY_MS);
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
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
    if (this._reofferTimeout !== undefined) {
      clearTimeout(this._reofferTimeout);
      this._reofferTimeout = undefined;
    }
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

  /** Accent the trigger while a demoted counter is still running. */
  readonly isDemotedCounterRunning = computed(
    () => this.isDemotedCounters() && this.enabledSimpleCounters().some((c) => c.isOn),
  );

  // Sync is the one demotable action carrying state the user is meant to notice
  // without opening anything, and `MainHeaderComponent` is the app's only
  // consumer of `syncState$` — several ERROR transitions show no snack at all,
  // so this button is the whole persistent signal. While sync is in the panel
  // the trigger has to speak for it.
  //
  // One computed rather than a class binding per state, so the precedence is a
  // testable line of code instead of a cascade accident, and so a seventh slot
  // wanting the trigger's attention has somewhere to plug in. Order matches the
  // inline button's own icon cascade: offline short-circuits before error.
  //
  // Deliberately does NOT republish `!syncIsEnabledAndReady()`. Inline that
  // renders `sync_disabled`, but it is also the resting state of everyone who
  // has never configured sync, so mirroring it would brand the trigger for the
  // majority who have nothing wrong. The cost is that a mid-session credential
  // revocation reads as plain "more actions" until the panel is opened.
  readonly demotedSyncState = computed<'offline' | 'error' | null>(() => {
    if (!this.isDemotedSync() || !this.syncIsEnabledAndReady()) {
      return null;
    }
    if (!this.isOnline()) {
      return 'offline';
    }
    return this.syncState() === 'ERROR' ? 'error' : null;
  });

  /**
   * Colour alone would be WCAG 1.4.1 — and useless to a screen reader — so the
   * trigger also swaps its glyph and hands its tooltip over to `syncTooltip()`,
   * which MatTooltip exposes as `aria-describedby`. The `aria-label` stays
   * "More actions": that is still what the button *does*.
   */
  readonly overflowIcon = computed(() => {
    if (this.isOverflowOpen()) {
      return 'close';
    }
    switch (this.demotedSyncState()) {
      case 'error':
        return 'sync_problem';
      case 'offline':
        return 'wifi_off';
      default:
        return 'more_horiz';
    }
  });

  readonly overflowTooltip = computed(() =>
    this.demotedSyncState() ? this.syncTooltip() : T.G.MORE_ACTIONS,
  );

  readonly demotedConflictCount = computed(() =>
    this.isDemotedSync() ? this.unreviewedConflictCount() : 0,
  );

  /**
   * The panel is not a `mat-menu`, so dismissal is ours to handle — but only
   * while there is something to dismiss.
   *
   * These were `@HostListener('document:…')`, which arms them for the app's
   * whole lifetime. Angular's listener wrapper marks the view dirty *before*
   * the handler body runs, and the zoneless scheduler does not skip that, so
   * every pointerdown anywhere in the app — every tap on a task row — was
   * scheduling a change-detection pass over this header just to be told the
   * panel was closed. Native listeners, attached only while it is open, notify
   * nothing.
   */
  private _listenForDismissal(): void {
    effect((onCleanup) => {
      if (!this.isOverflowOpen()) {
        return;
      }
      const onPointerDown = (ev: Event): void => {
        const target = ev.target as Node | null;
        if (!target || this._isInsidePanel(target)) {
          return;
        }
        this._closeOverflow();
      };
      const onKeyDown = (ev: KeyboardEvent): void => {
        if (ev.key === 'Escape') {
          this._closeOverflow(true);
        }
      };
      document.addEventListener('pointerdown', onPointerDown, true);
      document.addEventListener('keydown', onKeyDown, true);
      onCleanup(() => {
        document.removeEventListener('pointerdown', onPointerDown, true);
        document.removeEventListener('keydown', onKeyDown, true);
      });
    });
  }

  /**
   * Whether an event target counts as "inside" the open panel.
   *
   * The CDK overlay container is inside for this purpose even though it lives
   * on `document.body`: demoted actions open real menus and dialogs
   * (`user-profile-button`, `simple-counter-button`), and treating the first
   * click on one of their items as an outside click closed the panel out from
   * under the still-open menu — after which the menu's own focus restore
   * pointed into a now-`inert` subtree and focus fell to `<body>`.
   */
  private _isInsidePanel(target: Node): boolean {
    const host = this._elRef.nativeElement as HTMLElement;
    const panel = host?.querySelector?.('.header-overflow-panel');
    const trigger = host?.querySelector?.('.header-overflow-btn');
    const el = target instanceof Element ? target : target.parentElement;
    return (
      !!panel?.contains(target) ||
      !!trigger?.contains(target) ||
      !!el?.closest('.cdk-overlay-container')
    );
  }

  /**
   * @param restoreFocus hand focus back to the trigger first. Closing applies
   * `inert` to the panel, so focus standing inside it would otherwise be
   * dropped to `<body>` — which is what Escape does to a keyboard user who has
   * tabbed into a demoted action.
   */
  private _closeOverflow(restoreFocus = false): void {
    if (restoreFocus) {
      const host = this._elRef.nativeElement as HTMLElement;
      const panel = host?.querySelector?.('.header-overflow-panel');
      if (panel?.contains(document.activeElement)) {
        (host?.querySelector?.('.header-overflow-btn') as HTMLElement | null)?.focus();
      }
    }
    this.isOverflowOpen.set(false);
  }

  get kb(): KeyboardConfig {
    return keyboardConfigOrEmpty(this._configService.cfg()?.keyboard as KeyboardConfig);
  }
}
