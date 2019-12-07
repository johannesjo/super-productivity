import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {TaskService} from '../../features/tasks/task.service';
import {expandAnimation, expandFadeAnimation} from '../../ui/animations/expand.ani';
import {LayoutService} from '../../core-ui/layout/layout.service';
import {DragulaService} from 'ng2-dragula';
import {TakeABreakService} from '../../features/time-tracking/take-a-break/take-a-break.service';
import {ActivatedRoute} from '@angular/router';
import {from, fromEvent, Observable, ReplaySubject, Subscription, timer, zip} from 'rxjs';
import {TaskWithSubTasks} from '../../features/tasks/task.model';
import {delay, distinctUntilChanged, filter, map, share, switchMap} from 'rxjs/operators';
import {fadeAnimation} from '../../ui/animations/fade.ani';
import {PlanningModeService} from '../../features/planning-mode/planning-mode.service';
import {T} from '../../t.const';
import {ImprovementService} from '../../features/metric/improvement/improvement.service';
import {ProjectService} from '../../features/project/project.service';
import {workViewProjectChangeAnimation} from '../../ui/animations/work-view-project-change.ani';
import {observeWidth} from '../../util/resize-observer-obs';
import {BodyClass} from '../../app.constants';
import {DOCUMENT} from '@angular/common';

const SUB = 'SUB';
const PARENT = 'PARENT';
const SMALL_CONTAINER_WIDTH = 600;
const VERY_SMALL_CONTAINER_WIDTH = 450;

@Component({
  selector: 'work-view',
  templateUrl: './work-view-page.component.html',
  styleUrls: ['./work-view-page.component.scss'],
  animations: [expandFadeAnimation, expandAnimation, fadeAnimation, workViewProjectChangeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkViewPageComponent implements OnInit, OnDestroy, AfterContentInit {
  isShowTimeWorkedWithoutBreak = true;
  splitInputPos = 100;
  isPreloadBacklog = false;
  T = T;

  undoneTasks$: Observable<TaskWithSubTasks[]> = this.taskService.undoneTasks$;
  doneTasks$: Observable<TaskWithSubTasks[]> = this.taskService.doneTasks$;

  // NOTE: not perfect but good enough for now
  isTriggerBacklogIconAni$ = this.taskService.onMoveToBacklog$.pipe(
    switchMap(() =>
      zip(
        from([true, false]),
        timer(1, 200),
      ),
    ),
    map(v => v[0]),
  );

  containerWidth$: Observable<number> = this.projectService.isProjectChanging$.pipe(
    filter(isChanging => !isChanging),
    delay(50),
    switchMap(() => this.containerEl$),
    switchMap((containerEl) => observeWidth(containerEl)),
    share(),
  );

  containerScroll$ = this.projectService.isProjectChanging$.pipe(
    filter(isChanging => !isChanging),
    delay(50),
    switchMap(() => this.splitTopEl$),
    switchMap((el) => fromEvent(el, 'scroll')),
  );

  isSmallMainContainer$: Observable<boolean> = this.containerWidth$.pipe(
    map(v => v < SMALL_CONTAINER_WIDTH),
    distinctUntilChanged(),
  );
  isVerySmallMainContainer$: Observable<boolean> = this.containerWidth$.pipe(
    map(v => v < VERY_SMALL_CONTAINER_WIDTH),
    distinctUntilChanged(),
  );


  @ViewChild('splitTopEl', {static: false, read: ElementRef}) set splitTopElRef(ref: ElementRef) {
    if (ref) {
      this.splitTopEl$.next(ref.nativeElement);
    }
  }

  @ViewChild('containerEl', {static: false, read: ElementRef}) set setContainerElRef(ref: ElementRef) {
    if (ref) {
      this.containerEl$.next(ref.nativeElement);
    }
  }

  splitTopEl$ = new ReplaySubject<HTMLElement>(1);
  containerEl$ = new ReplaySubject<HTMLElement>(1);

  private _subs = new Subscription();
  private _switchListAnimationTimeout: number;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public taskService: TaskService,
    public projectService: ProjectService,
    public takeABreakService: TakeABreakService,
    public planningModeService: PlanningModeService,
    public improvementService: ImprovementService,
    public layoutService: LayoutService,
    private _dragulaService: DragulaService,
    private _activatedRoute: ActivatedRoute,
  ) {
  }


  ngOnInit() {
    const sub = this._dragulaService.find(SUB);
    const par = this._dragulaService.find(PARENT);

    if (!sub) {
      this._dragulaService.createGroup(SUB, {
        direction: 'vertical',
        moves: (el, container, handle) => {
          return handle.className.indexOf && handle.className.indexOf('handle-sub') > -1;
        }
      });
    }
    if (!par) {
      this._dragulaService.createGroup(PARENT, {
        direction: 'vertical',
        moves: (el, container, handle) => {
          return handle.className.indexOf && handle.className.indexOf('handle-par') > -1;
        }
      });
    }
    // preload
    this._subs.add(this.taskService.backlogTasks$.subscribe());

    this._subs.add(this._activatedRoute.queryParams
      .subscribe((params) => {
        if (params && params.backlogPos) {
          this.splitInputPos = params.backlogPos;
        }
      }));
  }

  ngAfterContentInit(): void {
    this._subs.add(
      this.containerScroll$.subscribe(({target}) => {
        ((target as HTMLElement).scrollTop !== 0)
          ? this.layoutService.isScrolled$.next(true)
          : this.layoutService.isScrolled$.next(false);
      })
    );

    this._subs.add(this.isSmallMainContainer$.subscribe(v => {
      v
        ? this.document.body.classList.add(BodyClass.isSmallMainContainer)
        : this.document.body.classList.remove(BodyClass.isSmallMainContainer);
    }));
    this._subs.add(this.isVerySmallMainContainer$.subscribe(v => {
      v
        ? this.document.body.classList.add(BodyClass.isVerySmallMainContainer)
        : this.document.body.classList.remove(BodyClass.isVerySmallMainContainer);
    }));
  }

  ngOnDestroy() {
    if (this._switchListAnimationTimeout) {
      window.clearTimeout(this._switchListAnimationTimeout);
    }
    this.layoutService.isScrolled$.next(false);
  }


  planMore() {
    this.planningModeService.enterPlanningMode();
  }

  startWork() {
    this.taskService.startFirstStartable();
    this.planningModeService.leavePlanningMode();
  }

  resetBreakTimer() {
    this.takeABreakService.resetTimer();
  }
}
