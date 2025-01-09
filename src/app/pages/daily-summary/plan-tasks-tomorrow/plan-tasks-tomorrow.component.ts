import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkContextService } from '../../../features/work-context/work-context.service';
import { TaskService } from '../../../features/tasks/task.service';
import { T } from 'src/app/t.const';
import { TaskRepeatCfgService } from '../../../features/task-repeat-cfg/task-repeat-cfg.service';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { MatIcon } from '@angular/material/icon';
import { AddScheduledTodayOrTomorrowBtnComponent } from '../../../features/add-tasks-for-tomorrow/add-scheduled-for-tomorrow/add-scheduled-today-or-tomorrow-btn.component';
import { AsyncPipe } from '@angular/common';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { AddTaskBarComponent } from '../../../features/tasks/add-task-bar/add-task-bar.component';
import { TaskListComponent } from '../../../features/tasks/task-list/task-list.component';

@Component({
  selector: 'plan-tasks-tomorrow',
  templateUrl: './plan-tasks-tomorrow.component.html',
  styleUrls: ['./plan-tasks-tomorrow.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
  imports: [
    MatIcon,

    AddScheduledTodayOrTomorrowBtnComponent,
    AsyncPipe,
    MsToStringPipe,
    TranslatePipe,
    AddTaskBarComponent,
    TaskListComponent,
  ],
})
export class PlanTasksTomorrowComponent {
  workContextService = inject(WorkContextService);
  taskService = inject(TaskService);
  _taskRepeatCfgService = inject(TaskRepeatCfgService);

  T: typeof T = T;
}
