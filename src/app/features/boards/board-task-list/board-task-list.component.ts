import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { PlannerTaskComponent } from '../../planner/planner-task/planner-task.component';
import { BoardPanelCfg, BoardPanelCfgTaskDoneState } from '../boards.model';
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
import { AsyncPipe } from '@angular/common';
import { LocalDateStrPipe } from '../../../ui/pipes/local-date-str.pipe';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { PlannerService } from '../../planner/planner.service';
import { DialogScheduleTaskComponent } from '../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'board-task-list',
  standalone: true,
  imports: [
    CdkDrag,
    PlannerTaskComponent,
    CdkDropList,
    AddTaskInlineComponent,
    AsyncPipe,
    LocalDateStrPipe,
    MatIcon,
    MatIconButton,
    TranslatePipe,
  ],
  templateUrl: './board-task-list.component.html',
  styleUrl: './board-task-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardTaskListComponent {
  T = T;

  panelCfg = input.required<BoardPanelCfg>();

  store = inject(Store);
  taskService = inject(TaskService);
  plannerService = inject(PlannerService);
  _matDialog = inject(MatDialog);

  allTasks$ = this.store.select(selectAllTasks);
  allTasks = toSignal(this.allTasks$, {
    initialValue: [],
  });

  additionalTaskFields = computed(() => {
    const panelCfg = this.panelCfg();
    return {
      ...(panelCfg.includedTagIds ? { tagIds: panelCfg.includedTagIds } : {}),
      // ...(panelCfg.projectId ? { projectId: panelCfg.projectId } : {}),
      ...(panelCfg.taskDoneState === BoardPanelCfgTaskDoneState.Done
        ? { isDone: true }
        : {}),
      ...(panelCfg.taskDoneState === BoardPanelCfgTaskDoneState.UnDone
        ? { isDone: false }
        : {}),
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

      if (panelCfg.taskDoneState === BoardPanelCfgTaskDoneState.Done) {
        isTaskIncluded = isTaskIncluded && task.isDone;
      }

      if (panelCfg.taskDoneState === BoardPanelCfgTaskDoneState.UnDone) {
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

    let newTagIds: string[] = task.tagIds;

    if (panelCfg.includedTagIds?.length) {
      newTagIds = newTagIds.concat(panelCfg.includedTagIds);
    }
    if (panelCfg.excludedTagIds?.length) {
      newTagIds = newTagIds.filter((tagId) => !panelCfg.excludedTagIds!.includes(tagId));
    }
    console.log({ ev, newTagIds, panelCfg, taskIds });

    this.taskService.updateTags(task, unique(newTagIds));
    if (panelCfg.taskDoneState === BoardPanelCfgTaskDoneState.Done) {
      this.store.dispatch(
        updateTask({ task: { id: task.id, changes: { isDone: true } } }),
      );
    } else if (panelCfg.taskDoneState === BoardPanelCfgTaskDoneState.UnDone) {
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

  afterTaskAdd({
    taskId,
    isAddToBottom,
  }: {
    taskId: string;
    isAddToBottom: boolean;
  }): void {
    const panelCfg = this.panelCfg();
    this.store.dispatch(
      BoardsActions.updatePanelCfgTaskIds({
        panelId: panelCfg.id,
        taskIds: isAddToBottom
          ? [...panelCfg.taskIds, taskId]
          : [taskId, ...panelCfg.taskIds],
      }),
    );
  }

  scheduleTask(task: TaskCopy, ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this._matDialog.open(DialogScheduleTaskComponent, {
      restoreFocus: true,
      data: { task },
    });
  }
}
