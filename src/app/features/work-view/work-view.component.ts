import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
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
import {delay, filter, map, switchMap} from 'rxjs/operators';
import {fadeAnimation} from '../../ui/animations/fade.ani';
import {PlanningModeService} from '../../features/planning-mode/planning-mode.service';
import {T} from '../../t.const';
import {ImprovementService} from '../../features/metric/improvement/improvement.service';
import {ProjectService} from '../../features/project/project.service';
import {workViewProjectChangeAnimation} from '../../ui/animations/work-view-project-change.ani';
import {WorkContextService} from '../work-context/work-context.service';

const SUB = 'SUB';
const PARENT = 'PARENT';


@Component({
  selector: 'work-view',
  templateUrl: './work-view.component.html',
  styleUrls: ['./work-view.component.scss'],
  animations: [expandFadeAnimation, expandAnimation, fadeAnimation, workViewProjectChangeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkViewComponent implements OnInit, OnDestroy, AfterContentInit {
  @Input() undoneTasks: TaskWithSubTasks[];
  @Input() doneTasks: TaskWithSubTasks[];
  @Input() backlogTasks: TaskWithSubTasks[];
  @Input() isShowBacklog = true;

  isShowTimeWorkedWithoutBreak = true;
  splitInputPos = 100;
  isPreloadBacklog = false;
  T = T;


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
  splitTopEl$ = new ReplaySubject<HTMLElement>(1);
  upperContainerScroll$ = this.projectService.isProjectChanging$.pipe(
    filter(isChanging => !isChanging),
    delay(50),
    switchMap(() => this.splitTopEl$),
    switchMap((el) => fromEvent(el, 'scroll')),
  );
  private _subs = new Subscription();
  private _switchListAnimationTimeout: number;

  constructor(
    public taskService: TaskService,
    public projectService: ProjectService,
    public takeABreakService: TakeABreakService,
    public planningModeService: PlanningModeService,
    public improvementService: ImprovementService,
    public layoutService: LayoutService,
    public workContextService: WorkContextService,
    private _elementRef: ElementRef,
    private _dragulaService: DragulaService,
    private _activatedRoute: ActivatedRoute,
  ) {
  }

  @ViewChild('splitTopEl', {read: ElementRef}) set splitTopElRef(ref: ElementRef) {
    if (ref) {
      this.splitTopEl$.next(ref.nativeElement);
    }
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
    this._subs.add(this.workContextService.backlogTasks$.subscribe());

    this._subs.add(this._activatedRoute.queryParams
      .subscribe((params) => {
        if (params && params.backlogPos) {
          this.splitInputPos = params.backlogPos;
        }
      }));
  }

  ngAfterContentInit(): void {
    this._subs.add(
      this.upperContainerScroll$.subscribe(({target}) => {
        ((target as HTMLElement).scrollTop !== 0)
          ? this.layoutService.isScrolled$.next(true)
          : this.layoutService.isScrolled$.next(false);
      })
    );
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
