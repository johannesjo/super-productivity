import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';

@Component({
  selector: 'daily-planner',
  templateUrl: './daily-planner.component.html',
  styleUrls: ['./daily-planner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailyPlannerComponent implements OnInit {
  todaysTasks$: Observable<TaskWithSubTasks[]> = this._taskService.todaysTasks$;
  backlogTasks$: Observable<TaskWithSubTasks[]> = this._taskService.backlogTasks$;
  estimateRemainingBacklog$: Observable<number> = this._taskService.estimateRemainingBacklog$;
  focusTaskIdList$: Observable<string[]> = this._taskService.focusIdsForDailyPlanner$;

  constructor(private _taskService: TaskService) {
  }


  ngOnInit() {
  }

}
