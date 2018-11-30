import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { expandAnimation, expandFadeAnimation } from '../../ui/animations/expand.ani';
import { LayoutService } from '../../core/layout/layout.service';
import { DragulaService } from 'ng2-dragula';
import { TakeABreakService } from '../../time-tracking/take-a-break/take-a-break.service';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { Actions } from '@ngrx/effects';
import { take } from 'rxjs/operators';
import { fadeAnimation } from '../../ui/animations/fade.ani';

@Component({
  selector: 'work-view',
  templateUrl: './work-view-page.component.html',
  styleUrls: ['./work-view-page.component.scss'],
  animations: [expandFadeAnimation, expandAnimation, fadeAnimation]
})
export class WorkViewPageComponent implements OnInit, OnDestroy {
  isShowTimeWorkedWithoutBreak = true;
  // no todays tasks at all
  isPlanYourDay = false;
  splitInputPos = 0;

  // we do it here to have the tasks in memory all the time
  backlogTasks: TaskWithSubTasks[];

  isTriggerSwitchListAni = false;

  private _subs = new Subscription();
  private _switchListAnimationTimeout: number;

  constructor(
    public taskService: TaskService,
    public takeABreakService: TakeABreakService,
    private _layoutService: LayoutService,
    private _dragulaService: DragulaService,
    private _activatedRoute: ActivatedRoute,
    private _actions$: Actions,
    private _cd: ChangeDetectorRef,
  ) {
  }


  ngOnInit() {
    this._dragulaService.createGroup('PARENT', {
      direction: 'vertical',
      moves: function (el, container, handle) {
        // console.log('moves par', handle.className, handle.className.indexOf('handle-par') > -1);
        return handle.className.indexOf && handle.className.indexOf('handle-par') > -1;
      }
    });

    this._dragulaService.createGroup('SUB', {
      direction: 'vertical',
      moves: function (el, container, handle) {
        // console.log('moves sub', handle.className, handle.className.indexOf('handle-sub') > -1);
        return handle.className.indexOf && handle.className.indexOf('handle-sub') > -1;
      }
    });

    this._subs.add(this.taskService.backlogTasks$.subscribe(tasks => this.backlogTasks = tasks));

    this._subs.add(this.taskService.onTaskSwitchList$.subscribe(() => this._triggerTaskSwitchListAnimation()));

    this._subs.add(
      combineLatest(
        this.taskService.isTriggerPlanningMode$,
        this.taskService.backlogTasks$
      )
        .pipe(take(1))
        .subscribe(([isPlanning, backlogTasks]) => {
          this.isPlanYourDay = isPlanning;
          if (isPlanning && backlogTasks && backlogTasks.length) {
            this.splitInputPos = 50;
          } else {
            this.splitInputPos = 100;
          }
          this._cd.detectChanges();
        })
    );

    this._subs.add(this._activatedRoute.queryParams
      .subscribe((params) => {
        if (params && params.backlogPos) {
          this.splitInputPos = params.backlogPos;
        }
      }));
  }


  ngOnDestroy() {
    this._dragulaService.destroy('PARENT');
    this._dragulaService.destroy('SUB');
    if (this._switchListAnimationTimeout) {
      window.clearTimeout(this._switchListAnimationTimeout);
    }
  }

  showAddTaskBar() {
    this._layoutService.showAddTaskBar();
  }

  // TODO not pretty
  startWork() {
    console.log('START');

    this.isPlanYourDay = false;
    this._subs.add(this.taskService.startableTasks$
      .pipe(take(1))
      .subscribe(tasks => {
        this.taskService.setCurrentId(tasks[0] && tasks[0].id);
      }));
  }

  private _triggerTaskSwitchListAnimation() {
    this.isTriggerSwitchListAni = true;
    this._cd.detectChanges();
    this._switchListAnimationTimeout = window.setTimeout(() => {
      this.isTriggerSwitchListAni = false;
      this._cd.detectChanges();
    }, 300);
  }
}
