import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { T } from '../../../t.const';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskService } from '../../tasks/task.service';
import { AddTasksForTomorrowService } from '../add-tasks-for-tomorrow.service';

@Component({
  selector: 'add-scheduled-today-or-tomorrow-btn',
  standalone: true,
  imports: [AsyncPipe, MatButton, MatIcon, NgIf, TranslateModule],
  templateUrl: './add-scheduled-today-or-tomorrow-btn.component.html',
  styleUrl: './add-scheduled-today-or-tomorrow-btn.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddScheduledTodayOrTomorrowBtnComponent {
  protected readonly T = T;

  @Input() public isAlwaysShowIfAny: boolean = false;

  constructor(
    public workContextService: WorkContextService,
    public taskService: TaskService,
    public addTasksForTomorrowService: AddTasksForTomorrowService,
  ) {}
}
