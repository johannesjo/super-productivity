import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { TaskService } from '../tasks/task.service';
import { expandAnimation, expandFadeAnimation } from '../../ui/animations/expand.ani';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { DragulaService } from 'ng2-dragula';
import { TakeABreakService } from '../time-tracking/take-a-break/take-a-break.service';
import { ActivatedRoute } from '@angular/router';
import {
  from,
  fromEvent,
  Observable,
  ReplaySubject,
  Subscription,
  timer,
  zip,
} from 'rxjs';
import { TaskPlanned, TaskWithSubTasks } from '../tasks/task.model';
import { delay, filter, map, switchMap } from 'rxjs/operators';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { PlanningModeService } from '../planning-mode/planning-mode.service';
import { T } from '../../t.const';
import { ImprovementService } from '../metric/improvement/improvement.service';
import { workViewProjectChangeAnimation } from '../../ui/animations/work-view-project-change.ani';
import { WorkContextService } from '../work-context/work-context.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';

const SUB = 'SUB';
const PARENT = 'PARENT';

@Component({
  selector: 'work-view',
  templateUrl: './work-view.component.html',
  styleUrls: ['./work-view.component.scss'],
  animations: [
    expandFadeAnimation,
    expandAnimation,
    fadeAnimation,
    workViewProjectChangeAnimation,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkViewComponent implements OnInit, OnDestroy, AfterContentInit {
  @Input() undoneTasks: TaskWithSubTasks[] = [];
  @Input() doneTasks: TaskWithSubTasks[] = [];
  @Input() backlogTasks: TaskWithSubTasks[] = [];
  @Input() isShowBacklog: boolean = false;

  isShowTimeWorkedWithoutBreak: boolean = true;
  splitInputPos: number = 100;
  isPreloadBacklog: boolean = false;
  T: typeof T = T;

  // NOTE: not perfect but good enough for now
  isTriggerBacklogIconAni$: Observable<boolean> =
    this.workContextService.onMoveToBacklog$.pipe(
      switchMap(() => zip(from([true, false]), timer(1, 200))),
      map((v) => v[0]),
    );
  splitTopEl$: ReplaySubject<HTMLElement> = new ReplaySubject(1);

  // TODO make this work for tag page without backlog
  upperContainerScroll$: Observable<Event> =
    this.workContextService.isContextChanging$.pipe(
      filter((isChanging) => !isChanging),
      delay(50),
      switchMap(() => this.splitTopEl$),
      switchMap((el) => fromEvent(el, 'scroll')),
    );

  // eslint-disable-next-line no-mixed-operators
  private _tomorrow: number = Date.now() + 24 * 60 * 60 * 1000;
  repeatableScheduledForTomorrow$: Observable<TaskRepeatCfg[]> =
    this._taskRepeatCfgService.getRepeatTableTasksDueForDay$(this._tomorrow);

  private _subs: Subscription = new Subscription();
  private _switchListAnimationTimeout?: number;

  constructor(
    public taskService: TaskService,
    public takeABreakService: TakeABreakService,
    public planningModeService: PlanningModeService,
    public improvementService: ImprovementService,
    public layoutService: LayoutService,
    public workContextService: WorkContextService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _dragulaService: DragulaService,
    private _activatedRoute: ActivatedRoute,
  ) {}

  @ViewChild('splitTopEl', { read: ElementRef }) set splitTopElRef(ref: ElementRef) {
    if (ref) {
      this.splitTopEl$.next(ref.nativeElement);
    }
  }

  ngOnInit() {
    // eslint-disable-next-line no-mixed-operators
    this._tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    const sub = this._dragulaService.find(SUB);
    const par = this._dragulaService.find(PARENT);

    if (!sub) {
      this._dragulaService.createGroup(SUB, {
        direction: 'vertical',
        moves: (el, container, handle) => {
          return (
            !!handle &&
            handle.className.indexOf &&
            handle.className.indexOf('handle-sub') > -1
          );
        },
      });
    }
    if (!par) {
      this._dragulaService.createGroup(PARENT, {
        direction: 'vertical',
        moves: (el, container, handle) => {
          return (
            !!handle &&
            handle.className.indexOf &&
            handle.className.indexOf('handle-par') > -1
          );
        },
      });
    }
    // preload
    // TODO check
    // this._subs.add(this.workContextService.backlogTasks$.subscribe());

    this._subs.add(
      this._activatedRoute.queryParams.subscribe((params) => {
        if (params && params.backlogPos) {
          this.splitInputPos = params.backlogPos;
        } else if (params.isInBacklog === 'true') {
          this.splitInputPos = 50;
        }
      }),
    );
  }

  ngAfterContentInit(): void {
    this._subs.add(
      this.upperContainerScroll$.subscribe(({ target }) => {
        if ((target as HTMLElement).scrollTop !== 0) {
          this.layoutService.isScrolled$.next(true);
        } else {
          this.layoutService.isScrolled$.next(false);
        }
      }),
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
    this.planningModeService.leavePlanningMode();
  }

  // NOTE: there is a duplicate of this in plan-tasks-tomorrow.component
  addAllPlannedToDayAndCreateRepeatable(
    plannedTasks: TaskPlanned[],
    repeatableScheduledForTomorrow: TaskRepeatCfg[],
  ) {
    this._taskRepeatCfgService.addAllPlannedToDayAndCreateRepeatable(
      plannedTasks,
      repeatableScheduledForTomorrow,
      this.taskService.currentTaskId,
      this._tomorrow,
    );
  }

  resetBreakTimer() {
    this.takeABreakService.resetTimer();
  }
}
