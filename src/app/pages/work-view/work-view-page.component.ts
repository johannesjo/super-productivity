import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {TaskService} from '../../features/tasks/task.service';
import {expandAnimation, expandFadeAnimation} from '../../ui/animations/expand.ani';
import {LayoutService} from '../../core-ui/layout/layout.service';
import {DragulaService} from 'ng2-dragula';
import {TakeABreakService} from '../../features/time-tracking/take-a-break/take-a-break.service';
import {ActivatedRoute} from '@angular/router';
import {from, Subscription, timer, zip} from 'rxjs';
import {TaskWithSubTasks} from '../../features/tasks/task.model';
import {map, switchMap} from 'rxjs/operators';
import {fadeAnimation} from '../../ui/animations/fade.ani';
import {PlanningModeService} from '../../features/planning-mode/planning-mode.service';
import {T} from '../../t.const';

const SUB = 'SUB';
const PARENT = 'PARENT';

@Component({
  selector: 'work-view',
  templateUrl: './work-view-page.component.html',
  styleUrls: ['./work-view-page.component.scss'],
  animations: [expandFadeAnimation, expandAnimation, fadeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkViewPageComponent implements OnInit, OnDestroy {
  isShowTimeWorkedWithoutBreak = true;
  splitInputPos = 100;
  isPreloadBacklog = false;
  T = T;

  // we do it here to have the tasks in memory all the time
  backlogTasks: TaskWithSubTasks[];

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
    public takeABreakService: TakeABreakService,
    public planningModeService: PlanningModeService,
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
        moves: function (el, container, handle) {
          return handle.className.indexOf && handle.className.indexOf('handle-sub') > -1;
        }
      });
    }
    if (!par) {
      this._dragulaService.createGroup(PARENT, {
        direction: 'vertical',
        moves: function (el, container, handle) {
          return handle.className.indexOf && handle.className.indexOf('handle-par') > -1;
        }
      });
    }

    this._subs.add(this.taskService.backlogTasks$.subscribe(tasks => this.backlogTasks = tasks));

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
