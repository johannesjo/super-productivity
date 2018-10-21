import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { TaskWithAllData } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';

@Component({
  selector: 'daily-planner',
  templateUrl: './daily-planner.component.html',
  styleUrls: ['./daily-planner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailyPlannerComponent implements OnInit {
  todaysTasks$: Observable<TaskWithAllData[]> = this._taskService.todaysTasks$;
  backlogTasks$: Observable<TaskWithAllData[]> = this._taskService.backlogTasks$;

  constructor(private _taskService: TaskService) {
  }


  ngOnInit() {
  }

}
