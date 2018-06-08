import {Component, OnInit} from '@angular/core';
import {TaskService} from '../tasks/task.service';
import {Observable} from 'rxjs';
import {Task} from '../tasks/task';

@Component({
  selector: 'work-view',
  templateUrl: './work-view.component.html',
  styleUrls: ['./work-view.component.scss'],
  providers: [TaskService],
})
export class WorkViewComponent implements OnInit {
  tasks$: Observable<Task[]>;

  constructor(private _taskService: TaskService) {
  }

  ngOnInit() {
    this.tasks$ = this._taskService.tasks$;
  }
}
