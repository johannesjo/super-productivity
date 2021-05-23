import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkContextService } from '../../../features/work-context/work-context.service';
import { TaskService } from '../../../features/tasks/task.service';
import { T } from 'src/app/t.const';
import { TaskPlanned } from '../../../features/tasks/task.model';
import { TODAY_TAG } from '../../../features/tag/tag.const';

@Component({
  selector: 'plan-tasks-tomorrow',
  templateUrl: './plan-tasks-tomorrow.component.html',
  styleUrls: ['./plan-tasks-tomorrow.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanTasksTomorrowComponent {
  T: typeof T = T;

  constructor(
    public workContextService: WorkContextService,
    public taskService: TaskService,
  ) {}

  addAllPlannedToToday(plannedTasks: TaskPlanned[]) {
    plannedTasks.forEach((t) => {
      this.taskService.moveToToday(t.id);
      this.taskService.updateTags(t, [...t.tagIds, TODAY_TAG.id], t.tagIds);
    });
  }
}
