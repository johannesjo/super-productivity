import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {TaskService} from '../../features/tasks/task.service';
import {expandAnimation, expandFadeAnimation} from '../../ui/animations/expand.ani';
import {LayoutService} from '../../core-ui/layout/layout.service';
import {DragulaService} from 'ng2-dragula';
import {TakeABreakService} from '../../features/time-tracking/take-a-break/take-a-break.service';
import {ActivatedRoute} from '@angular/router';
import {from, Observable, of, Subscription, timer, zip} from 'rxjs';
import {TaskWithSubTasks} from '../../features/tasks/task.model';
import {delay, map, startWith, switchMap} from 'rxjs/operators';
import {fadeAnimation} from '../../ui/animations/fade.ani';
import {PlanningModeService} from '../../features/planning-mode/planning-mode.service';
import {T} from '../../t.const';
import {ImprovementService} from '../../features/metric/improvement/improvement.service';
import {ProjectService} from '../../features/project/project.service';
import {fadeListAfterAnimation} from '../../ui/animations/fade-animate-list';

const SUB = 'SUB';
const PARENT = 'PARENT';
const TASK_LIST_INITIAL_DELAY = 10;

@Component({
  selector: 'work-view',
  templateUrl: './work-view-page.component.html',
  styleUrls: ['./work-view-page.component.scss'],
  animations: [expandFadeAnimation, expandAnimation, fadeAnimation, fadeListAfterAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkViewPageComponent implements OnInit, OnDestroy {
  isShowTimeWorkedWithoutBreak = true;
  splitInputPos = 100;
  isPreloadBacklog = false;
  T = T;

  undoneTasks$: Observable<TaskWithSubTasks[]> = this.projectService.isProjectChanging$.pipe(
    delay(TASK_LIST_INITIAL_DELAY),
    switchMap((isChanging) => isChanging ? of([]) : this.taskService.undoneTasks$),
    startWith([])
  );

  doneTasks$: Observable<TaskWithSubTasks[]> = this.projectService.isProjectChanging$.pipe(
    delay(TASK_LIST_INITIAL_DELAY),
    switchMap((isChanging) => isChanging ? of([]) : this.taskService.doneTasks$),
    startWith([])
  );


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

  private _subs = new Subscription();
  private _switchListAnimationTimeout: number;

  constructor(
    public taskService: TaskService,
    public projectService: ProjectService,
    public takeABreakService: TakeABreakService,
    public planningModeService: PlanningModeService,
    public improvementService: ImprovementService,
    private _layoutService: LayoutService,
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


  ngOnDestroy() {
    if (this._switchListAnimationTimeout) {
      window.clearTimeout(this._switchListAnimationTimeout);
    }
  }

  showAddTaskBar() {
    this._layoutService.showAddTaskBar();
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
