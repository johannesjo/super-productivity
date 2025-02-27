import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { PlannerTaskComponent } from '../../planner/planner-task/planner-task.component';
import { BoardPanelCfg, BoarFieldsToRemove } from '../boards.model';
import { Store } from '@ngrx/store';
import { selectAllTasks } from '../../tasks/store/task.selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import { AddTaskInlineComponent } from '../../planner/add-task-inline/add-task-inline.component';
import { T } from '../../../t.const';
import { TaskCopy } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';

@Component({
  selector: 'board-task-list',
  standalone: true,
  imports: [CdkDrag, PlannerTaskComponent, CdkDropList, AddTaskInlineComponent],
  templateUrl: './board-task-list.component.html',
  styleUrl: './board-task-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardTaskListComponent {
  T = T;

  panelCfg = input.required<BoardPanelCfg>();
  fieldsToRemove = input.required<BoarFieldsToRemove>();

  store = inject(Store);
  taskService = inject(TaskService);

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
    const orderedTasks: TaskCopy[] = [];
    const nonOrderedTasks: TaskCopy[] = [];

    const allFilteredTasks = this.allTasks().filter((task) => {
      if (panelCfg.tagIds?.length) {
        return panelCfg.tagIds!.every((tagId) => task.tagIds.includes(tagId));
      }
      return false;
    });

    allFilteredTasks.forEach((task) => {
      const index = panelCfg.taskIds.indexOf(task.id);
      if (index > -1) {
        orderedTasks[index] = task;
      } else {
        nonOrderedTasks.push(task);
      }
    });

    return [...orderedTasks, ...nonOrderedTasks];
  });

  drop(ev: CdkDragDrop<BoardPanelCfg, string, TaskCopy>): void {
    const panelCfg = ev.container.data;
    const task = ev.item.data;
    const fieldsToRemove = this.fieldsToRemove();
    let newTagIds: string[] = [];
    if (fieldsToRemove.tagIds?.length) {
      newTagIds = task.tagIds.filter((tagId) => !fieldsToRemove.tagIds!.includes(tagId));
    }
    if (panelCfg.tagIds) {
      newTagIds = newTagIds.concat(panelCfg.tagIds);
    }

    this.taskService.updateTags(task, newTagIds);
    // const allTasks = this.tasks();

    console.log(ev, panelCfg, task);
  }
}
