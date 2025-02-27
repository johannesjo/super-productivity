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
import { AddTaskInlineComponent } from '../../planner/add-task-inline/add-task-inline.component';
import { T } from '../../../t.const';

@Component({
  selector: 'board-task-list',
  standalone: true,
  imports: [CdkDrag, PlannerTaskComponent, CdkDropList, AddTaskInlineComponent],
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

  additionalTaskFields = computed(() => {
    const panelCfg = this.panelCfg();
    return {
      ...(panelCfg.tagIds ? { tagIds: panelCfg.tagIds } : {}),
      ...(panelCfg.projectId ? { projectId: panelCfg.projectId } : {}),
    };
  });

  tasks = computed(() => {
    const panelCfg = this.panelCfg();
    return this.allTasks().filter((task) => {
      if (panelCfg.tagIds?.length) {
        return panelCfg.tagIds!.every((tagId) => task.tagIds.includes(tagId));
      }
      return false;
    });
  });
  protected readonly T = T;
}
