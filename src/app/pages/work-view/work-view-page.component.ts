import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { Observable } from 'rxjs';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { expandFadeAnimation } from '../../ui/animations/expand.ani';

@Component({
  selector: 'work-view',
  templateUrl: './work-view-page.component.html',
  styleUrls: ['./work-view-page.component.scss'],
  animations: [expandFadeAnimation]
})
export class WorkViewPageComponent implements OnInit {
  doneTasks$: Observable<TaskWithSubTasks[]> = this._taskService.doneTasks$;
  undoneTasks$: Observable<TaskWithSubTasks[]> = this._taskService.undoneTasks$;
  workingToday$: Observable<number> = this._taskService.workingToday$;
  estimateRemaining$: Observable<number> = this._taskService.estimateRemainingToday$;

  // todo move to selector
  focusTaskIdList$: Observable<string[]> = this._taskService.focusIdsForWorkView$;

  isVertical = false;
  isHideControls: boolean;
  workedWithoutABreak = '-';
  isShowTimeWorkedWithoutBreak = true;

  backlogTasks$: Observable<TaskWithSubTasks[]> = this._taskService.backlogTasks$;
  estimateRemainingBacklog$: Observable<number> = this._taskService.estimateRemainingBacklog$;

  // TODO
  isPlanYourDay = false; // = first start in day or no todays tasks at all (session needed)
  isShowBacklog = false; // if isPlanYourDay and  show only if there are actually some

  constructor(private _taskService: TaskService) {
    // this.focusTaskIdList$.subscribe(v => console.log(v));
  }

  ngOnInit() {
  }

  collapseAllNotesAndSubTasks() {

  }
}
