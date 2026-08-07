import {
  Component,
  ElementRef,
  EnvironmentInjector,
  NO_ERRORS_SCHEMA,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { EMPTY, of } from 'rxjs';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { PluginBridgeService } from '../../plugins/plugin-bridge.service';

import { MainHeaderComponent } from './main-header.component';
import { ProjectService } from '../../features/project/project.service';
import { LayoutService } from '../layout/layout.service';
import { TaskService } from '../../features/tasks/task.service';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { SimpleCounterService } from '../../features/simple-counter/simple-counter.service';
import { SyncWrapperService } from '../../imex/sync/sync-wrapper.service';
import { SnackService } from '../../core/snack/snack.service';
import { Router } from '@angular/router';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';
import { MetricService } from '../../features/metric/metric.service';
import { DateService } from '../../core/date/date.service';
import { UserProfileService } from '../../features/user-profile/user-profile.service';
import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';
import { SyncStatus } from '../../op-log/sync-exports';
import { SimpleCounter } from '../../features/simple-counter/simple-counter.model';
import { ConflictJournalService } from '../../op-log/sync/conflict-journal.service';

// Regression test for #7477: in a project view a long title pushed the
// right-side header actions (simple-counter / habit buttons) off screen.
//
// The fix is a CSS-only flex change on `.action-nav-right` in
// main-header.component.scss, so we don't instantiate the real (heavy)
// MainHeaderComponent. Instead we mount a tiny host that pulls in the *real*
// compiled stylesheet via `styleUrls` and reproduces the exact failing flex
// structure: a constrained `.wrapper` row containing a shrinkable title and
// the `.action-nav-right` nav whose `.counters-action-group` children are
// `flex-shrink: 0`. We then assert observable layout rather than CSS strings.
//
// The discriminating rule under test is `.action-nav-right { flex: 0 0 auto }`:
// remove it and the nav shrinks, its non-shrinking buttons overflow, and the
// last button's right edge escapes the row — which is exactly the bug.
@Component({
  standalone: true,
  styleUrls: ['./main-header.component.scss'],
  template: `
    <div
      class="wrapper"
      style="width: 320px; box-sizing: border-box"
    >
      <div
        class="page-title"
        style="
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        "
      >
        {{ title }}
      </div>

      <nav class="action-nav-right">
        <div class="header-action-group secondary-action-group counters-action-group">
          <button type="button"></button>
          <button type="button"></button>
          <button type="button"></button>
          <button type="button"></button>
        </div>
      </nav>
    </div>
  `,
})
class HeaderLayoutHostComponent {
  title = 'A very long active work context title '.repeat(8);
}

describe('MainHeaderComponent layout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderLayoutHostComponent],
    }).compileComponents();
  });

  it('keeps the action buttons on screen when the title is long (#7477)', () => {
    const fixture = TestBed.createComponent(HeaderLayoutHostComponent);
    // Layout must be computed in the live DOM for width measurements.
    document.body.appendChild(fixture.nativeElement);
    try {
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('.wrapper') as HTMLElement;
      const title = fixture.nativeElement.querySelector('.page-title') as HTMLElement;
      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll('.counters-action-group button'),
      ) as HTMLElement[];
      const lastButton = buttons[buttons.length - 1];

      // Sanity: the real stylesheet was applied, so the buttons have width.
      expect(buttons.length).toBe(4);
      expect(lastButton.getBoundingClientRect().width).toBeGreaterThan(0);

      // The title takes the squeeze and ellipsizes...
      expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);

      // ...so the trailing action button stays fully inside the header row.
      const wrapperRect = wrapper.getBoundingClientRect();
      const lastButtonRect = lastButton.getBoundingClientRect();
      expect(lastButtonRect.right).toBeLessThanOrEqual(wrapperRect.right + 0.5);
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
  });
});

describe('MainHeaderComponent focus button visibility', () => {
  let component: MainHeaderComponent;
  let fixture: ComponentFixture<MainHeaderComponent> | undefined;
  let isXs = signal(false);
  let isXxxs = signal(false);
  let appFeatures = signal(DEFAULT_GLOBAL_CONFIG.appFeatures);
  let enabledSimpleCounters: SimpleCounter[] = [];
  let isAllDataLoaded = true;

  const configureTestBed = (): void => {
    const cfg = {
      ...DEFAULT_GLOBAL_CONFIG,
      appFeatures: appFeatures(),
    };

    TestBed.configureTestingModule({
      imports: [MainHeaderComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ElementRef,
          useValue: {
            nativeElement: {
              querySelector: () => null,
            },
          },
        },
        { provide: ProjectService, useValue: { getByIdOnce$: () => of(null) } },
        {
          provide: LayoutService,
          useValue: {
            isXs,
            isXxxs,
            isShowMobileBottomNav: isXs,
            isShowIssuePanel: signal(false),
            isShowNotes: signal(false),
            isShowScheduleDayPanel: signal(false),
          },
        },
        {
          provide: PluginBridgeService,
          useValue: {
            headerButtons: signal([]),
            workContextHeaderButtons: signal([]),
            sidePanelButtons: signal([]),
          },
        },
        {
          provide: TaskService,
          useValue: {
            currentTaskParentOrCurrent$: of(null),
            currentTask$: of(null),
            currentTaskId: signal(null),
          },
        },
        {
          provide: WorkContextService,
          useValue: {
            activeWorkContextId$: of(null),
            undoneTasks$: of([]),
          },
        },
        {
          provide: SimpleCounterService,
          useValue: { enabledSimpleCounters$: of(enabledSimpleCounters) },
        },
        {
          provide: SyncWrapperService,
          useValue: {
            sync: jasmine.createSpy('sync'),
            isEnabledAndReady$: of(false),
            syncState$: of('IN_SYNC'),
            isSyncInProgress$: of(false),
            hasNoPendingOps$: of(true),
            superSyncIsConfirmedInSync$: of(false),
          },
        },
        {
          provide: SnackService,
          useValue: {
            open: jasmine.createSpy('open'),
            hasPendingPersistentAction: jasmine.createSpy('hasPendingPersistentAction'),
          },
        },
        { provide: Router, useValue: { events: EMPTY } },
        {
          provide: GlobalConfigService,
          useValue: {
            cfg$: of(cfg),
            cfg: signal(cfg),
            appFeatures,
            misc: signal({ isVerticalActionBar: false }),
          },
        },
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
        { provide: Store, useValue: { dispatch: jasmine.createSpy('dispatch') } },
        {
          provide: DataInitStateService,
          useValue: { isAllDataLoadedInitially$: isAllDataLoaded ? of(true) : EMPTY },
        },
        { provide: MetricService, useValue: { getFocusSummaryForDay: () => null } },
        { provide: DateService, useValue: { todayStr: () => '2026-06-09' } },
        { provide: UserProfileService, useValue: { isInitialized: () => false } },
        { provide: ConflictJournalService, useValue: { unreviewedCount: signal(0) } },
      ],
    }).overrideComponent(MainHeaderComponent, {
      set: {
        // NgTemplateOutlet is real, not stubbed: the sync button is mounted
        // through it, and a stubbed outlet would leave `[data-slot="sync"]`
        // empty -- a slot the reflow measures at zero and would then have no
        // recorded width to restore it by.
        imports: [TranslatePipe, NgTemplateOutlet],
        schemas: [NO_ERRORS_SCHEMA],
      },
    });
  };

  const createComponent = (): MainHeaderComponent => {
    configureTestBed();
    return runInInjectionContext(TestBed.inject(EnvironmentInjector), () => {
      return new MainHeaderComponent();
    });
  };

  beforeEach(() => {
    isXs = signal(false);
    isXxxs = signal(false);
    appFeatures = signal(DEFAULT_GLOBAL_CONFIG.appFeatures);
    enabledSimpleCounters = [];
    isAllDataLoaded = true;
  });

  afterEach(() => {
    component?.ngOnDestroy();
    fixture?.destroy();
  });

  it('keeps the focus mode entry visible on narrow mobile screens (#8157)', () => {
    isXs = signal(true);
    isXxxs = signal(true);
    appFeatures = signal({
      ...DEFAULT_GLOBAL_CONFIG.appFeatures,
      isFocusModeEnabled: true,
    });

    component = createComponent();

    // The add button lives in the bottom nav's FAB on mobile, not the header.
    expect(component.showAddTaskInline()).toBe(false);
    expect(component.isFocusButtonVisible()).toBe(true);
  });

  it('hides the focus button when the app feature is disabled', () => {
    appFeatures = signal({
      ...DEFAULT_GLOBAL_CONFIG.appFeatures,
      isFocusModeEnabled: false,
    });

    component = createComponent();

    expect(component.isFocusButtonVisible()).toBe(false);
  });

  // The fit is measured, not predicted, so these mount the real component into
  // the live DOM at a fixed width and let the browser lay it out. Every earlier
  // version of this logic was unit-tested against injected widths and every one
  // of them shipped a bug where the arithmetic disagreed with the CSS (#9480).
  // The child components are stubbed here (NO_ERRORS_SCHEMA), so they measure
  // zero and nothing would ever overflow. Give each slot a known width instead:
  // that is the input the reflow reads in production too, so the algorithm --
  // measure, demote one, re-measure, settle -- is exercised for real while the
  // numbers stay under the test's control.
  const SLOT_TEST_W = 200;
  let styleEl: HTMLStyleElement | undefined;
  let box: HTMLElement | undefined;

  const mountAtWidth = async (width: number): Promise<HTMLElement> => {
    configureTestBed();
    fixture = TestBed.createComponent(MainHeaderComponent);
    const host = fixture.nativeElement as HTMLElement;
    styleEl = document.createElement('style');
    // Only the slots this configuration actually populates. A blanket rule
    // would also inflate the empty wrappers (no plugins, no counters here) and
    // measure widths that do not exist in production.
    styleEl.textContent =
      `[data-slot="panelButtons"],[data-slot="sync"]` +
      `{min-width:${SLOT_TEST_W}px !important}`;
    document.head.appendChild(styleEl);
    box = document.createElement('div');
    box.style.width = `${width}px`;
    document.body.appendChild(box);
    box.appendChild(host);
    // The reflow runs on an animation frame (never inside change detection --
    // writing from a render hook is what NG0103 forbids), and moves one action
    // per frame. So let frames actually pass: one per demotable action, plus
    // margin.
    const appRef = TestBed.inject(ApplicationRef);
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 20));
      appRef.tick();
      await fixture.whenStable();
    }
    return host;
  };

  /** Resize the mounted header and let the reflow settle again. */
  const resizeTo = async (width: number): Promise<void> => {
    box!.style.width = `${width}px`;
    const appRef = TestBed.inject(ApplicationRef);
    for (let i = 0; i < 12; i++) {
      // The reflow is woken by the ResizeObserver and runs on an animation
      // frame -- ticking alone would never see the new width.
      await new Promise((r) => setTimeout(r, 20));
      appRef.tick();
      await fixture!.whenStable();
    }
  };

  afterEach(() => {
    styleEl?.remove();
    box?.remove();
    styleEl = undefined;
    box = undefined;
  });

  it('brings actions back when the header widens again (#9480)', async () => {
    // Demotion must not be a one-way ratchet. It was: slack was measured only
    // as how much further `.page-title` could shrink, and a short name sits at
    // its min-width already, so there was never any slack to report. One
    // transient overflow demoted an action and nothing could restore it, until
    // the header was collapsed at every width.
    const host = await mountAtWidth(220);
    expect(host.querySelector('.header-overflow-btn')).toBeTruthy();

    await resizeTo(1400);

    expect(host.querySelector('[data-slot="panelButtons"]')).toBeTruthy();
    expect(host.querySelector('[data-slot="sync"]')).toBeTruthy();
    expect(host.querySelector('.header-overflow-btn')).toBeFalsy();
  });

  it('moves actions into the overflow panel when the header is narrow (#9480)', async () => {
    // Two 200px slots (panel buttons, sync) cannot both sit in 320px.
    const host = await mountAtWidth(320);

    const panel = host.querySelector('.header-overflow-panel');
    expect(host.querySelector('.header-overflow-btn')).toBeTruthy();
    expect(panel).toBeTruthy();
    // Panel buttons lead the demotion order, so they are what left the bar.
    expect(host.querySelector('[data-slot="panelButtons"]')).toBeFalsy();
    expect(panel!.querySelector('desktop-panel-buttons')).toBeTruthy();
  });

  it('keeps every action in the bar when the header is wide (#9480)', async () => {
    const host = await mountAtWidth(1400);

    expect(host.querySelector('.header-overflow-btn')).toBeFalsy();
    expect(host.querySelector('.header-overflow-panel')).toBeFalsy();
    expect(host.querySelector('.tour-addBtn')).toBeTruthy();
    expect(host.querySelector('[data-slot="panelButtons"]')).toBeTruthy();
  });

  it('never leaves a demoted action with nowhere to be (#9480)', async () => {
    // The bug this whole change exists to fix is an action that is in neither
    // the bar nor a panel. At 220px nothing fits, so everything demotable has
    // to have moved -- and every one of them must be findable in the panel.
    const host = await mountAtWidth(220);
    const panel = host.querySelector('.header-overflow-panel');

    expect(panel).toBeTruthy();
    expect(host.querySelector('[data-slot="panelButtons"]')).toBeFalsy();
    expect(panel!.querySelector('desktop-panel-buttons')).toBeTruthy();
    expect(host.querySelector('[data-slot="sync"]')).toBeFalsy();
    expect(panel!.querySelector('.sync-btn')).toBeTruthy();
  });

  it('keeps the add-task button in the bar at any width (#9480)', async () => {
    // Add-task is pinned, not demoted last. It is the primary quick-capture
    // entry point and where there is no bottom-nav FAB the header button is the
    // only one on the page, so it must never end up behind the overflow tap --
    // however little room is left. Sync yields in its place.
    const host = await mountAtWidth(220);

    const addBtn = host.querySelector('.tour-addBtn');
    expect(addBtn).toBeTruthy();
    // In the bar, not in the panel.
    expect(host.querySelector('.header-overflow-panel')!.contains(addBtn)).toBe(false);
    expect(host.querySelector('nav.action-nav-right')!.contains(addBtn)).toBe(true);
  });

  it('shows the add-task button before initial data load finishes', () => {
    // The shell paints before op-log hydration completes; the quick-capture
    // entry point must already be there in that window, while the
    // data-dependent header parts still wait for the data-loaded signal.
    isAllDataLoaded = false;

    configureTestBed();
    fixture = TestBed.createComponent(MainHeaderComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tour-addBtn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('page-title')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.counters-action-group')).toBeFalsy();
  });

  it('keeps a persistent recovery action instead of showing routine sync success', async () => {
    component = createComponent();
    const syncWrapperService = TestBed.inject(
      SyncWrapperService,
    ) as jasmine.SpyObj<SyncWrapperService>;
    const snackService = TestBed.inject(SnackService) as jasmine.SpyObj<SnackService>;
    syncWrapperService.sync.and.resolveTo(SyncStatus.UpdateRemote);
    snackService.hasPendingPersistentAction.and.returnValue(true);

    component.sync();
    await Promise.resolve();

    expect(snackService.open).not.toHaveBeenCalled();
  });
});
