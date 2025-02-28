import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { PlannerTaskComponent } from '../../planner/planner-task/planner-task.component';
import { BoardPanelCfg } from '../boards.model';
import { Store } from '@ngrx/store';
import { selectAllTasks } from '../../tasks/store/task.selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import { AddTaskInlineComponent } from '../../planner/add-task-inline/add-task-inline.component';
import { T } from '../../../t.const';
import { TaskCopy } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';
import { BoardsActions } from '../store/boards.actions';
import { moveItemInArray } from '../../../util/move-item-in-array';
import { unique } from '../../../util/unique';
import { updateTask } from '../../tasks/store/task.actions';

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

  store = inject(Store);
  taskService = inject(TaskService);

  allTasks$ = this.store.select(selectAllTasks);
  allTasks = toSignal(this.allTasks$, {
    initialValue: [],
  });

  additionalTaskFields = computed(() => {
    const panelCfg = this.panelCfg();
    return {
      ...(panelCfg.includedTagIds ? { tagIds: panelCfg.includedTagIds } : {}),
      ...(panelCfg.projectId ? { projectId: panelCfg.projectId } : {}),
      ...(panelCfg.isDoneOnly ? { isDone: true } : {}),
      ...(panelCfg.isUnDoneOnly ? { isDone: false } : {}),
    };
  });

  tasks = computed(() => {
    const panelCfg = this.panelCfg();
    const orderedTasks: TaskCopy[] = [];
    const nonOrderedTasks: TaskCopy[] = [];

    const allFilteredTasks = this.allTasks().filter((task) => {
      let isTaskIncluded = true;
      if (panelCfg.includedTagIds?.length) {
        isTaskIncluded = panelCfg.includedTagIds.every((tagId) =>
          task.tagIds.includes(tagId),
        );
      }
      if (panelCfg.excludedTagIds?.length) {
        isTaskIncluded =
          isTaskIncluded &&
          !panelCfg.excludedTagIds.some((tagId) => task.tagIds.includes(tagId));
      }

      if (panelCfg.isDoneOnly) {
        isTaskIncluded = isTaskIncluded && task.isDone;
      }

      if (panelCfg.isUnDoneOnly) {
        isTaskIncluded = isTaskIncluded && !task.isDone;
      }

      return isTaskIncluded;
    });

    allFilteredTasks.forEach((task) => {
      const index = panelCfg.taskIds.indexOf(task.id);
      if (index > -1) {
        orderedTasks[index] = task;
      } else {
        nonOrderedTasks.push(task);
      }
    });
    return [...orderedTasks, ...nonOrderedTasks].filter((t) => !!t);
  });

  drop(ev: CdkDragDrop<BoardPanelCfg, string, TaskCopy>): void {
    const panelCfg = ev.container.data;
    const task = ev.item.data;
    const prevTaskIds = this.tasks().map((t) => t.id);

    const taskIds = prevTaskIds.includes(task.id)
      ? // move in array
        moveItemInArray(prevTaskIds, ev.previousIndex, ev.currentIndex)
      : // NOTE: original array is mutated and splice does not return a new array
        prevTaskIds.splice(ev.currentIndex, 0, task.id) && prevTaskIds;
    console.log(ev);

    let newTagIds: string[] = task.tagIds;
    console.log({ panelCfg });

    if (panelCfg.includedTagIds?.length) {
      newTagIds = newTagIds.concat(panelCfg.includedTagIds);
    }
    if (panelCfg.excludedTagIds?.length) {
      newTagIds = newTagIds.filter((tagId) => !panelCfg.excludedTagIds!.includes(tagId));
    }
    console.log(newTagIds);

    this.taskService.updateTags(task, unique(newTagIds));
    if (panelCfg.isDoneOnly) {
      this.store.dispatch(
        updateTask({ task: { id: task.id, changes: { isDone: true } } }),
      );
    } else if (panelCfg.isUnDoneOnly) {
      this.store.dispatch(
        updateTask({ task: { id: task.id, changes: { isDone: false } } }),
      );
    }

    this.store.dispatch(
      BoardsActions.updatePanelCfgTaskIds({
        panelId: panelCfg.id,
        taskIds,
      }),
    );
  }
}
