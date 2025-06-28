import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  Renderer2,
  signal,
} from '@angular/core';
import { ProjectService } from '../../features/project/project.service';
import { LayoutService } from '../layout/layout.service';
import { TaskService } from '../../features/tasks/task.service';
import { PomodoroService } from '../../features/pomodoro/pomodoro.service';
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
import { TaskViewCustomizerService } from 'src/app/features/task-view-customizer/task-view-customizer.service';
import { KeyboardConfig } from 'src/app/features/config/keyboard-config.model';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { AsyncPipe } from '@angular/common';
import { SimpleCounterButtonComponent } from '../../features/simple-counter/simple-counter-button/simple-counter-button.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogSyncInitialCfgComponent } from '../../imex/sync/dialog-sync-initial-cfg/dialog-sync-initial-cfg.component';
import { LongPressDirective } from '../../ui/longpress/longpress.directive';
import { isOnline$ } from '../../util/is-online';
import { Store } from '@ngrx/store';
import { showFocusOverlay } from '../../features/focus-mode/store/focus-mode.actions';
import { SyncStatus } from '../../pfapi/api';
import { PluginHeaderBtnsComponent } from '../../plugins/ui/plugin-header-btns.component';
import { PluginSidePanelBtnsComponent } from '../../plugins/ui/plugin-side-panel-btns.component';
import { WorkContextTitleComponent } from './work-context-title/work-context-title.component';
import { PlayButtonComponent } from './play-button/play-button.component';
import { DesktopPanelButtonsComponent } from './desktop-panel-buttons/desktop-panel-buttons.component';
import { MobileSidePanelMenuComponent } from './mobile-side-panel-menu/mobile-side-panel-menu.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, expandFadeHorizontalAnimation],
  imports: [
    MatIconButton,
    MatIcon,
    MatTooltip,
    TranslatePipe,
    AsyncPipe,
    SimpleCounterButtonComponent,
    LongPressDirective,
    PluginHeaderBtnsComponent,
    PluginSidePanelBtnsComponent,
    MobileSidePanelMenuComponent,
    WorkContextTitleComponent,
    PlayButtonComponent,
    DesktopPanelButtonsComponent,
  ],
})
export class MainHeaderComponent implements OnDestroy {
  readonly projectService = inject(ProjectService);
  readonly matDialog = inject(MatDialog);
  readonly workContextService = inject(WorkContextService);
  readonly taskViewCustomizerService = inject(TaskViewCustomizerService);
  readonly taskService = inject(TaskService);
  readonly pomodoroService = inject(PomodoroService);
  readonly layoutService = inject(LayoutService);
  readonly simpleCounterService = inject(SimpleCounterService);
  readonly syncWrapperService = inject(SyncWrapperService);
  readonly globalConfigService = inject(GlobalConfigService);
  readonly breakpointObserver = inject(BreakpointObserver);
  private readonly _renderer = inject(Renderer2);
  private readonly _snackService = inject(SnackService);
  private readonly _router = inject(Router);
  private readonly _store = inject(Store);
  private readonly _configService = inject(GlobalConfigService);

  T: typeof T = T;
  progressCircleRadius: number = 10;
  circumference: number = this.progressCircleRadius * Math.PI * 2;
  isShowSimpleCounterBtnsMobile = signal(false);

  // Convert breakpoint observer to signals
  private _isXs$ = this.breakpointObserver.observe('(max-width: 600px)');
  private _isXxxs$ = this.breakpointObserver.observe('(max-width: 398px)');

  isXs = toSignal(this._isXs$.pipe(map((result) => result.matches)), {
    initialValue: false,
  });

  isXxxs = toSignal(this._isXxxs$.pipe(map((result) => result.matches)), {
    initialValue: false,
  });

  showDesktopButtons = computed(() => !this.isXs());

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
    filter((event: any) => event instanceof NavigationEnd),
    map((event) => !!event.urlAfterRedirects.match(/(tasks|daily-summary)$/)),
    startWith(!!this._router.url.match(/(tasks|daily-summary)$/)),
  );
  isRouteWithSidePanel = toSignal(this._isRouteWithSidePanel$, { initialValue: false });

  private _isScheduleSection$ = this._router.events.pipe(
    filter((event: any) => event instanceof NavigationEnd),
    map((event) => !!event.urlAfterRedirects.match(/(schedule)$/)),
    startWith(!!this._router.url.match(/(schedule)$/)),
  );
  isScheduleSection = toSignal(this._isScheduleSection$, { initialValue: false });

  // Convert more observables to signals
  activeWorkContextTypeAndId = toSignal(
    this.workContextService.activeWorkContextTypeAndId$,
  );
  activeWorkContextTitle = toSignal(this.workContextService.activeWorkContextTitle$);
  isNavAlwaysVisible = toSignal(this.layoutService.isNavAlwaysVisible$);
  currentTask = toSignal(this.taskService.currentTask$);
  currentTaskId = toSignal(this.taskService.currentTaskId$);
  pomodoroIsEnabled = toSignal(this.pomodoroService.isEnabled$);
  pomodoroIsBreak = toSignal(this.pomodoroService.isBreak$);
  pomodoroCurrentSessionTime = toSignal(this.pomodoroService.currentSessionTime$);
  enabledSimpleCounters = toSignal(this.simpleCounterService.enabledSimpleCounters$, {
    initialValue: [],
  });
  isShowTaskViewCustomizerPanel = toSignal(
    this.layoutService.isShowTaskViewCustomizerPanel$,
  );
  isShowIssuePanel = toSignal(this.layoutService.isShowIssuePanel$);
  isShowNotes = toSignal(this.layoutService.isShowNotes$);
  syncIsEnabledAndReady = toSignal(this.syncWrapperService.isEnabledAndReady$);
  syncState = toSignal(this.syncWrapperService.syncState$);
  isSyncInProgress = toSignal(this.syncWrapperService.isSyncInProgress$);
  focusModeConfig = toSignal(
    this.globalConfigService.cfg$.pipe(map((cfg) => cfg?.focusMode)),
  );
  isOnline = toSignal(isOnline$);

  private _subs: Subscription = new Subscription();

  selectedTimeView$ = this.layoutService.selectedTimeView$;

  selectTimeView(view: 'week' | 'month'): void {
    this.layoutService.setTimeView(view);
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  trackById(i: number, item: SimpleCounter): string {
    return item.id;
  }

  sync(): void {
    this.syncWrapperService.sync().then((r) => {
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

  private dialogSyncCfgRef: MatDialogRef<DialogSyncInitialCfgComponent> | null = null;

  setupSync(): void {
    // to prevent multiple dialogs on longpress from android
    if (this.dialogSyncCfgRef) {
      return;
    }
    this.dialogSyncCfgRef = this.matDialog.open(DialogSyncInitialCfgComponent);
    this._subs.add(
      this.dialogSyncCfgRef.afterClosed().subscribe(() => {
        this.dialogSyncCfgRef = null;
      }),
    );
  }

  isCounterRunning(counters: SimpleCounter[]): boolean {
    return !!(counters && counters.find((counter) => counter.isOn));
  }

  enableFocusMode(): void {
    this._store.dispatch(showFocusOverlay());
  }

  get kb(): KeyboardConfig {
    return (this._configService.cfg?.keyboard as KeyboardConfig) || {};
  }
}
