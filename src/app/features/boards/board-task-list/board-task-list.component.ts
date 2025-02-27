import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { PlannerTaskComponent } from '../../planner/planner-task/planner-task.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorkContextService } from '../../work-context/work-context.service';

@Component({
  selector: 'board-task-list',
  standalone: true,
  imports: [CdkDrag, PlannerTaskComponent, CdkDropList],
  templateUrl: './board-task-list.component.html',
  styleUrl: './board-task-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardTaskListComponent {
  workContextService = inject(WorkContextService);

  tasks = toSignal(this.workContextService.todaysTasks$);
}
