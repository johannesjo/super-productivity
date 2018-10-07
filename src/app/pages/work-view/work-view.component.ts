import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { Observable } from 'rxjs';
import { TaskWithData } from '../../tasks/task.model';

@Component({
  selector: 'work-view',
  templateUrl: './work-view.component.html',
  styleUrls: ['./work-view.component.scss'],
})
export class WorkViewComponent implements OnInit {
  doneTasks$: Observable<TaskWithData[]> = this._taskService.doneTasks$;
  undoneTasks$: Observable<TaskWithData[]> = this._taskService.undoneTasks$;

  constructor(private _taskService: TaskService) {
  }

  ngOnInit() {
  }
}
