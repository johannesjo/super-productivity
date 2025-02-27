import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { PlannerTaskComponent } from '../../planner/planner-task/planner-task.component';
import { BoardPanelCfg } from '../boards.model';
import { Store } from '@ngrx/store';
import { selectAllTasks } from '../../tasks/store/task.selectors';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'board-task-list',
  standalone: true,
  imports: [CdkDrag, PlannerTaskComponent, CdkDropList],
  templateUrl: './board-task-list.component.html',
  styleUrl: './board-task-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardTaskListComponent {
  // tasks = input.required<TaskCopy[]>();
  panelCfg = input.required<BoardPanelCfg>();

  store = inject(Store);

  allTasks$ = this.store.select(selectAllTasks);
  allTasks = toSignal(this.allTasks$, {
    initialValue: [],
  });

  tasks = computed(() => {
    const panelCfg = this.panelCfg();
    return this.allTasks().filter((task) => {
      if (panelCfg.tagIds?.length) {
        return panelCfg.tagIds!.every((tagId) => task.tagIds.includes(tagId));
      }
      return true;
    });
  });
}
