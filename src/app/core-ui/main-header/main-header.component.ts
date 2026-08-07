import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
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

  /** How many leading `_demotableIds` are in the overflow panel. */
  private readonly _demotedCount = signal(0);

  private _rafId = 0;
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

  readonly showPluginBtnsInline = computed(
    () => this.isDataLoaded() && !this.isDemotedPluginBtns(),
  );
  readonly showUserProfileInline = computed(
    () => this.isUserProfilesEnabled() && !this.isDemotedUserProfile(),
  );
  readonly showSidePanelBtnsInline = computed(
    () => !this._isOwnedByBottomNav() && !this.isDemotedSidePanelBtns(),
  );
  readonly showPanelBtnsInline = computed(
    () => !this._isOwnedByBottomNav() && !this.isDemotedPanelBtns(),
  );
  readonly showCountersInline = computed(() => !this.isDemotedCounters());
  readonly showSyncInline = computed(
    () => this.isSyncIconEnabled() && !this.isDemotedSync(),
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
    // switching to or from the mobile bottom nav.
    effect(() => {
      this._demotableIds();
      this._restartReflow();
    });

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
   * prefix count, so the only way it can come *down* is to recompute it. It
   * costs one frame in which the row renders everything and may overflow —
   * which, since the nav has a scroll floor, is a transient scroll rather than
   * a lost button. Narrowing skips it, because demoting further is already
   * enough and re-offering would make a drag-resize flicker.
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
    // The NAV's `scrollWidth`, not its rect. Since #9480 gave the nav a scroll
    // floor it is both shrinkable and a scroll container, so its rendered width
    // is clamped to whatever fits — by construction it always "fits", and a rect
    // measurement would report slack that does not exist, `free` would never go
    // negative, and nothing would ever demote. `scrollWidth` is the intrinsic
    // width the row wants, which is the question being asked. It rounds to an
    // integer; FIT_EPSILON absorbs that.
    const free = contentW - nav.scrollWidth - titleMinW - titleActionsW;

    const ids = this._demotableIds();
    const count = Math.min(this._demotedCount(), ids.length);
    if (count !== this._demotedCount()) {
      this._demotedCount.set(count);
      this._scheduleReflow();
      return;
    }

    if (free >= -FIT_EPSILON || count >= ids.length) {
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
    }
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
      if (width > 0 && width !== lastWidth) {
        const widened = width > lastWidth;
        lastWidth = width;
        // Only a widening needs the count re-derived from zero; narrowing just
        // demotes further from where it is. See `_restartReflow`.
        this._restartReflow(widened);
      }
    });
    this._resizeObserver.observe(el);
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

  /** The panel is not a `mat-menu`, so dismissal is ours to handle. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOverflowOpen.set(false);
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(ev: Event): void {
    if (!this.isOverflowOpen()) {
      return;
    }
    const target = ev.target as Node | null;
    const host = this._elRef.nativeElement as HTMLElement;
    const panel = host?.querySelector?.('.header-overflow-panel');
    const trigger = host?.querySelector?.('.header-overflow-btn');
    if (target && (panel?.contains(target) || trigger?.contains(target))) {
      return;
    }
    this.isOverflowOpen.set(false);
  }

  get kb(): KeyboardConfig {
    return keyboardConfigOrEmpty(this._configService.cfg()?.keyboard as KeyboardConfig);
  }
}
