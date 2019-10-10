import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {TaskService} from '../../../features/tasks/task.service';

@Component({
  selector: 'plan-tasks-tomorrow',
  templateUrl: './plan-tasks-tomorrow.component.html',
  styleUrls: ['./plan-tasks-tomorrow.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanTasksTomorrowComponent implements OnInit {

  constructor(
    public taskService: TaskService,
  ) { }

  ngOnInit() {
  }

}
