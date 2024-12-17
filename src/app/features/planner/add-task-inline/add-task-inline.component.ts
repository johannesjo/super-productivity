import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TasksModule } from '../../tasks/tasks.module';
import { UiModule } from '../../../ui/ui.module';
import { CommonModule } from '@angular/common';
import { T } from 'src/app/t.const';

@Component({
  selector: 'add-task-inline',
  imports: [TasksModule, UiModule, CommonModule],
  templateUrl: './add-task-inline.component.html',
  styleUrl: './add-task-inline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskInlineComponent {
  T: typeof T = T;

  @Input() planForDay?: string;

  isShowAddTask = false;
}
