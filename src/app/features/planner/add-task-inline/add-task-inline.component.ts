import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TasksModule } from '../../tasks/tasks.module';
import { UiModule } from '../../../ui/ui.module';

import { T } from 'src/app/t.const';

@Component({
  selector: 'add-task-inline',
  imports: [TasksModule, UiModule],
  templateUrl: './add-task-inline.component.html',
  styleUrl: './add-task-inline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskInlineComponent {
  T: typeof T = T;

  readonly planForDay = input<string>();

  isShowAddTask = false;
}
