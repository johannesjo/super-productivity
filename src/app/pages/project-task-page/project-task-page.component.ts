import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TaskService} from '../../features/tasks/task.service';

@Component({
  selector: 'work-view-page',
  templateUrl: './project-task-page.component.html',
  styleUrls: ['./project-task-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectTaskPageComponent {
  constructor(public taskService: TaskService) {
  }

}
