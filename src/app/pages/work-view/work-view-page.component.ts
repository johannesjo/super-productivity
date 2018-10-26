import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TaskWithSubTasks } from '../../tasks/task.model';

@Component({
  selector: 'work-view',
  templateUrl: './work-view-page.component.html',
  styleUrls: ['./work-view-page.component.scss'],
})
export class WorkViewPageComponent implements OnInit {
  doneTasks$: Observable<TaskWithSubTasks[]> = this._taskService.doneTasks$;
  undoneTasks$: Observable<TaskWithSubTasks[]> = this._taskService.undoneTasks$;
  workingToday$: Observable<number> = this._taskService.workingToday$;
  estimateRemaining$: Observable<number> = this._taskService.estimateRemaining$;

  // todo move to selector
  focusTaskIdList$: Observable<string[]> = combineLatest(
    this.undoneTasks$.pipe(map(task => task)),
    this.doneTasks$.pipe(map(task => task)),
  ).pipe(map((arrs) => {
    let ids = [];
    arrs.forEach(arr => {
      arr.forEach(task => {
        ids.push(task.id);
        ids = ids.concat(task.subTaskIds);
      });
    });
    return ids;
  }));

  isHideControls: boolean;
  workedWithoutABreak = '-';
  isShowTimeWorkedWithoutBreak = true;

  constructor(private _taskService: TaskService) {
    this.focusTaskIdList$.subscribe(v => console.log(v));
  }

  ngOnInit() {
  }

  collapseAllNotesAndSubTasks() {

  }
}
