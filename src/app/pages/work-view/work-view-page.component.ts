import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { Observable } from 'rxjs';
import { TaskWithAllData } from '../../tasks/task.model';

@Component({
  selector: 'work-view',
  templateUrl: './work-view-page.component.html',
  styleUrls: ['./work-view-page.component.scss'],
})
export class WorkViewPageComponent implements OnInit {
  doneTasks$: Observable<TaskWithAllData[]> = this._taskService.doneTasks$;
  undoneTasks$: Observable<TaskWithAllData[]> = this._taskService.undoneTasks$;
  workingToday$: Observable<number> = this._taskService.workingToday$;
  estimateRemaining$: Observable<number> = this._taskService.estimateRemaining$;

  constructor(private _taskService: TaskService) {
  }

  ngOnInit() {
  }
}
