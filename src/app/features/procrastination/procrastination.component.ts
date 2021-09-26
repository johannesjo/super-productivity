import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TaskService } from '../tasks/task.service';
import { T } from '../../t.const';

@Component({
  selector: 'procrastination',
  templateUrl: './procrastination.component.html',
  styleUrls: ['./procrastination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcrastinationComponent {
  T: typeof T = T;

  constructor(public taskService: TaskService) {}
}
