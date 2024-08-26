import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { ProjectService } from '../../features/project/project.service';
import { LayoutService } from '../layout/layout.service';
import { BookmarkService } from '../../features/bookmark/bookmark.service';
import { TaskService } from '../../features/tasks/task.service';
import { PomodoroService } from '../../features/pomodoro/pomodoro.service';
import { T } from '../../t.const';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { filter, first, map, startWith, switchMap } from 'rxjs/operators';
import { Observable, of, Subscription } from 'rxjs';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { TagService } from '../../features/tag/tag.service';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { expandFadeHorizontalAnimation } from '../../ui/animations/expand.ani';
import { SimpleCounterService } from '../../features/simple-counter/simple-counter.service';
import { SimpleCounter } from '../../features/simple-counter/simple-counter.model';
import { SyncProviderService } from '../../imex/sync/sync-provider.service';
import { SnackService } from '../../core/snack/snack.service';
import { NavigationEnd, Router } from '@angular/router';
import { FocusModeService } from '../../features/focus-mode/focus-mode.service';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { KeyboardConfig } from 'src/app/features/config/keyboard-config.model';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, expandFadeHorizontalAnimation],
})
export class MainHeaderComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  progressCircleRadius: number = 10;
  circumference: number = this.progressCircleRadius * Math.PI * 2;
  isShowSimpleCounterBtnsMobile: boolean = false;

  @ViewChild('circleSvg', { static: true }) circleSvg?: ElementRef;

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
              : this._tagService.getTagById$(currentTask.tagIds[0]).pipe(first());
          }),
        ),
      ),
    );

  isRouteWithSidePanel$: Observable<boolean> = this._router.events.pipe(
    filter((event: any) => event instanceof NavigationEnd),
    map((event) => !!event.url.match(/(tasks|timeline|daily-summary)$/)),
    startWith(!!this._router.url.match(/(tasks|timeline|daily-summary)$/)),
  );
  isRouteWithRightPanel$: Observable<boolean> = this._router.events.pipe(
    filter((event: any) => event instanceof NavigationEnd),
    map((event) => !!event.url.match(/(tasks|timeline)$/)),
    startWith(!!this._router.url.match(/(tasks|timeline)$/)),
  );

  private _subs: Subscription = new Subscription();

  constructor(
    public readonly projectService: ProjectService,
    public readonly workContextService: WorkContextService,
    public readonly bookmarkService: BookmarkService,
    public readonly taskService: TaskService,
    public readonly pomodoroService: PomodoroService,
    public readonly layoutService: LayoutService,
    public readonly simpleCounterService: SimpleCounterService,
    public readonly syncProviderService: SyncProviderService,
    public readonly globalConfigService: GlobalConfigService,
    private readonly _tagService: TagService,
    private readonly _renderer: Renderer2,
    private readonly _snackService: SnackService,
    private readonly _router: Router,
    private readonly _focusModeService: FocusModeService,
    private readonly _configService: GlobalConfigService,
  ) {}

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  ngOnInit(): void {
    this.taskService.currentTaskProgress$.subscribe((progressIN) => {
      if (this.circleSvg) {
        let progress = progressIN || 1;
        if (progress > 1) {
          progress = 1;
        }
        const dashOffset = this.circumference * -1 * progress;
        this._renderer.setStyle(
          this.circleSvg.nativeElement,
          'stroke-dashoffset',
          dashOffset,
        );
      }
    });
  }

  trackById(i: number, item: SimpleCounter): string {
    return item.id;
  }

  sync(): void {
    this.syncProviderService.sync().then((r) => {
      if (r === 'SUCCESS') {
        this._snackService.open({ type: 'SUCCESS', msg: T.F.SYNC.S.SUCCESS_VIA_BUTTON });
      }
    });
  }

  isCounterRunning(counters: SimpleCounter[]): boolean {
    return !!(counters && counters.find((counter) => counter.isOn));
  }

  enableFocusMode(): void {
    this._focusModeService.showFocusOverlay();
  }

  get kb(): KeyboardConfig {
    return (this._configService.cfg?.keyboard as KeyboardConfig) || {};
  }
}
