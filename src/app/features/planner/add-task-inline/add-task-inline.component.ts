import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiModule } from '../../../ui/ui.module';

import { T } from 'src/app/t.const';
import { AddTaskBarComponent } from '../../tasks/add-task-bar/add-task-bar.component';

@Component({
  selector: 'add-task-inline',
  imports: [UiModule, AddTaskBarComponent],
  templateUrl: './add-task-inline.component.html',
  styleUrl: './add-task-inline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskInlineComponent {
  T: typeof T = T;

  readonly planForDay = input<string>();

  isShowAddTask = false;
}
