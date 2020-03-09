import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TaskService} from '../../features/tasks/task.service';

@Component({
  selector: 'work-view-page',
  templateUrl: './work-view-page.component.html',
  styleUrls: ['./work-view-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkViewPageComponent {
  constructor(public taskService: TaskService) {
  }

}
