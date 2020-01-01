import {ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2, ViewChild, OnDestroy} from '@angular/core';
import {ProjectService} from '../../features/project/project.service';
import {LayoutService} from '../layout/layout.service';
import {BookmarkService} from '../../features/bookmark/bookmark.service';
import {TaskService} from '../../features/tasks/task.service';
import {PomodoroService} from '../../features/pomodoro/pomodoro.service';
import {T} from '../../t.const';
import {fadeAnimation} from '../../ui/animations/fade.ani';
import {NavigationStart, Router} from '@angular/router';
import {filter, map} from 'rxjs/operators';
import {combineLatest, Observable, Subscription} from 'rxjs';
import { LanguageService } from 'src/app/core/language/language.service';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation]
})
export class MainHeaderComponent implements OnInit, OnDestroy {
  T = T;
  progressCircleRadius = 10;
  circumference = this.progressCircleRadius * Math.PI * 2;

  @ViewChild('circleSvg', {static: true}) circleSvg: ElementRef;

  isShowTaskTitle$: Observable<boolean> = combineLatest([
    this._router.events.pipe(
      filter(event => event instanceof NavigationStart),
    ),
    this.taskService.currentTaskId$,
  ]).pipe(
    map(([routerEv, currentTaskId]: [NavigationStart, string]): boolean => {
      return routerEv.url !== '/work-view' && !!currentTaskId;
    })
  );

  private _subs = new Subscription();
  isRTL: boolean;

  constructor(
    public readonly projectService: ProjectService,
    public readonly bookmarkService: BookmarkService,
    public readonly taskService: TaskService,
    public readonly pomodoroService: PomodoroService,
    public readonly layoutService: LayoutService,
    private readonly _router: Router,
    private readonly _renderer: Renderer2,
    private _languageService: LanguageService,
  ) {
  }

  ngOnInit() {
    this.taskService.currentTaskProgress$.subscribe((progressIN) => {
      let progress = progressIN || 1;
      if (progress > 1) {
        progress = 1;
      }
      const dashOffset = this.circumference * -1 * progress;
      this._renderer.setStyle(this.circleSvg.nativeElement, 'stroke-dashoffset', dashOffset);
    });

    this._subs.add( this._languageService.isLangRTL.subscribe( (val) => {
      this.isRTL = val;
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
}
