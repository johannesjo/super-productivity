import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TasksModule } from '../../tasks/tasks.module';
import { UiModule } from '../../../ui/ui.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'add-task-inline',
  standalone: true,
  imports: [TasksModule, UiModule, CommonModule],
  templateUrl: './add-task-inline.component.html',
  styleUrl: './add-task-inline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskInlineComponent {
  @Input() planForDay?: string;

  isShowAddTask = false;
}
