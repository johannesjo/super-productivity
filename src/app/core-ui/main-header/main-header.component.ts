import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  Renderer2,
  viewChild,
} from '@angular/core';
import { ProjectService } from '../../features/project/project.service';
import { LayoutService } from '../layout/layout.service';
import { TaskService } from '../../features/tasks/task.service';
import { PomodoroService } from '../../features/pomodoro/pomodoro.service';
import { T } from '../../t.const';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { filter, map, startWith, switchMap } from 'rxjs/operators';
import { Observable, of, Subscription } from 'rxjs';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { expandFadeHorizontalAnimation } from '../../ui/animations/expand.ani';
import { SimpleCounterService } from '../../features/simple-counter/simple-counter.service';
import { SimpleCounter } from '../../features/simple-counter/simple-counter.model';
import { SyncWrapperService } from '../../imex/sync/sync-wrapper.service';
import { SnackService } from '../../core/snack/snack.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { KeyboardConfig } from 'src/app/features/config/keyboard-config.model';
import { MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuContent, MatMenuTrigger } from '@angular/material/menu';
import { WorkContextMenuComponent } from '../work-context-menu/work-context-menu.component';
import { AsyncPipe } from '@angular/common';
import { MsToMinuteClockStringPipe } from '../../ui/duration/ms-to-minute-clock-string.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { TagComponent } from '../../features/tag/tag/tag.component';
import { SimpleCounterButtonComponent } from '../../features/simple-counter/simple-counter-button/simple-counter-button.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogSyncInitialCfgComponent } from '../../imex/sync/dialog-sync-initial-cfg/dialog-sync-initial-cfg.component';
import { LongPressDirective } from '../../ui/longpress/longpress.directive';
import { isOnline$ } from '../../util/is-online';
import { Store } from '@ngrx/store';
import { showFocusOverlay } from '../../features/focus-mode/store/focus-mode.actions';
import { SyncStatus } from '../../pfapi/api';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, expandFadeHorizontalAnimation],
  imports: [
    MatIconButton,
    MatIcon,
    MatRipple,
    RouterLink,
    MatTooltip,
    MatMenuTrigger,
    MatMenu,
    MatMenuContent,
    WorkContextMenuComponent,
    MatMiniFabButton,
    AsyncPipe,
    MsToMinuteClockStringPipe,
    TranslatePipe,
    TagComponent,
    SimpleCounterButtonComponent,
    LongPressDirective,
  ],
})
export class MainHeaderComponent implements OnInit, OnDestroy {
  readonly projectService = inject(ProjectService);
  readonly matDialog = inject(MatDialog);
  readonly workContextService = inject(WorkContextService);
  readonly taskService = inject(TaskService);
  readonly pomodoroService = inject(PomodoroService);
  readonly layoutService = inject(LayoutService);
  readonly simpleCounterService = inject(SimpleCounterService);
  readonly syncWrapperService = inject(SyncWrapperService);
  readonly globalConfigService = inject(GlobalConfigService);
  private readonly _renderer = inject(Renderer2);
  private readonly _snackService = inject(SnackService);
  private readonly _router = inject(Router);
  private readonly _store = inject(Store);
  private readonly _configService = inject(GlobalConfigService);

  T: typeof T = T;
  progressCircleRadius: number = 10;
  circumference: number = this.progressCircleRadius * Math.PI * 2;
  isShowSimpleCounterBtnsMobile: boolean = false;

  readonly circleSvg = viewChild<ElementRef>('circleSvg');

  currentTaskContext$: Observable<Project | Tag | null> =
    this.taskService.currentTaskParentOrCurrent$.pipe(
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

  isRouteWithSidePanel$: Observable<boolean> = this._router.events.pipe(
    filter((event: any) => event instanceof NavigationEnd),
    map((event) => !!event.urlAfterRedirects.match(/(tasks|daily-summary)$/)),
    startWith(!!this._router.url.match(/(tasks|daily-summary)$/)),
  );
  isRouteWithRightPanel$: Observable<boolean> = this._router.events.pipe(
    filter((event: any) => event instanceof NavigationEnd),
    map((event) => !!event.urlAfterRedirects.match(/(tasks)$/)),
    startWith(!!this._router.url.match(/(tasks)$/)),
  );

  private _subs: Subscription = new Subscription();

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  ngOnInit(): void {
    this.taskService.currentTaskProgress$.subscribe((progressIN) => {
      const circleSvg = this.circleSvg();
      if (circleSvg) {
        let progress = progressIN || 1;
        if (progress > 1) {
          progress = 1;
        }
        const dashOffset = this.circumference * -1 * progress;
        this._renderer.setStyle(circleSvg.nativeElement, 'stroke-dashoffset', dashOffset);
      }
    });
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

  setupSync(): void {
    this.matDialog.open(DialogSyncInitialCfgComponent);
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

  protected readonly isOnline$ = isOnline$;
}
