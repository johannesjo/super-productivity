import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TaskService} from '../../../features/tasks/task.service';

@Component({
  selector: 'plan-tasks-tomorrow',
  templateUrl: './plan-tasks-tomorrow.component.html',
  styleUrls: ['./plan-tasks-tomorrow.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanTasksTomorrowComponent {

  constructor(
    public taskService: TaskService,
  ) {
  }
}
