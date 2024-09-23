import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { DropListModelSource, Task, TaskCopy, TaskWithSubTasks } from '../task.model';
import { TaskService } from '../task.service';
import { expandFadeFastAnimation } from '../../../ui/animations/expand.ani';
import { filterDoneTasks } from '../filter-done-tasks.pipe';
import { T } from '../../../t.const';
import { taskListAnimation } from './task-list-ani';
import { toSignal } from '@angular/core/rxjs-interop';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { WorkContextType } from '../../work-context/work-context.model';
import { moveTaskInTodayList } from '../../work-context/store/work-context-meta.actions';
import {
  moveProjectTaskInBacklogList,
  moveProjectTaskToBacklogList,
  moveProjectTaskToRegularList,
} from '../../project/store/project.actions';
import { moveSubTask } from '../store/task.actions';
import { WorkContextService } from '../../work-context/work-context.service';
import { Store } from '@ngrx/store';
import { moveItemBeforeItem } from '../../../util/move-item-before-item';
import { DropListService } from '../../../core-ui/drop-list/drop-list.service';

export type TaskListId = 'PARENT' | 'SUB';
export type ListModelId = DropListModelSource | string;
const PARENT_ALLOWED_LISTS = ['DONE', 'UNDONE', 'BACKLOG'];

export interface DropModelDataForList {
  listModelId: ListModelId;
  allTasks: TaskWithSubTasks[];
  filteredTasks: TaskWithSubTasks[];
}

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [taskListAnimation, expandFadeFastAnimation],
})
export class TaskListComponent implements OnDestroy, AfterViewInit {
  tasks = input<TaskWithSubTasks[]>([]);
  isHideDone = input(false);
  isHideAll = input(false);

  listId = input.required<TaskListId>();
  listModelId = input.required<ListModelId>();
  parentId = input<string | undefined>(undefined);

  noTasksMsg = input<string | undefined>(undefined);
  isBacklog = input(false);
  isSubTaskList = input(false);

  currentTaskId = toSignal(this._taskService.currentTaskId$);
  dropModelDataForList = computed<DropModelDataForList>(() => {
    return {
      listModelId: this.listModelId(),
      allTasks: this.tasks(),
      filteredTasks: this.filteredTasks(),
    };
  });

  filteredTasks = computed<TaskWithSubTasks[]>(() => {
    const tasks = this.tasks();
    if (this.listId() === 'PARENT') {
      return tasks;
    }
    const isHideDone = this.isHideDone();
    const isHideAll = this.isHideAll();
    const currentId = this.currentTaskId() || null;
    return filterDoneTasks(tasks, currentId, isHideDone, isHideAll);
  });

  doneTasksLength = computed(() => {
    return this.tasks()?.filter((task) => task.isDone).length ?? 0;
  });
  allTasksLength = computed(() => this.tasks()?.length ?? 0);

  @ViewChild(CdkDropList) dropList?: CdkDropList;

  T: typeof T = T;

  constructor(
    private _taskService: TaskService,
    private _workContextService: WorkContextService,
    private _store: Store,
    public dropListService: DropListService,
  ) {}

  ngAfterViewInit(): void {
    this.dropListService.registerDropList(this.dropList!, this.listId() === 'SUB');
  }

  ngOnDestroy(): void {
    this.dropListService.unregisterDropList(this.dropList!);
  }

  trackByFn(i: number, task: Task): string {
    return task.id;
  }

  enterPredicate(drag: CdkDrag, drop: CdkDropList): boolean {
    // TODO this gets called very often for nested lists. Maybe there are possibilities to optimize
    const task = drag.data;
    // const targetModelId = drag.dropContainer.data.listModelId;
    const targetModelId = drop.data.listModelId;
    const isSubtask = !!task.parentId;
    // console.log(drag.data.id, { isSubtask, targetModelId, drag, drop });
    // return true;
    if (isSubtask) {
      if (!PARENT_ALLOWED_LISTS.includes(targetModelId)) {
        return true;
      }
    } else {
      if (PARENT_ALLOWED_LISTS.includes(targetModelId)) {
        return true;
      }
    }
    return false;
  }

  async drop(
    srcFilteredTasks: TaskWithSubTasks[],
    ev: CdkDragDrop<DropModelDataForList, DropModelDataForList, TaskWithSubTasks>,
  ): Promise<void> {
    const srcListData = ev.previousContainer.data;
    const targetListData = ev.container.data;
    const draggedTask = ev.item.data;
    console.log({
      ev,
      srcListData,
      targetListData,
      draggedTask,
      listId: this.listId(),
      listModelId: this.listModelId(),
      filteredTasks: this.filteredTasks(),
    });

    const targetTask = targetListData.filteredTasks[ev.currentIndex] as TaskCopy;

    if (targetTask && targetTask.id === draggedTask.id) {
      return;
    }

    const newIds =
      targetTask && targetTask.id !== draggedTask.id
        ? [...moveItemBeforeItem(targetListData.filteredTasks, draggedTask, targetTask)]
        : [
            ...targetListData.filteredTasks.filter((t) => t.id !== draggedTask.id),
            draggedTask,
          ];
    console.log(srcListData.listModelId, '=>', targetListData.listModelId, {
      targetTask,
      draggedTask,
      newIds,
    });

    this.dropListService.blockAniTrigger$.next();
    this._move(
      draggedTask.id,
      srcListData.listModelId,
      targetListData.listModelId,
      newIds.map((p) => p.id),
    );
  }

  private _move(
    taskId: string,
    src: DropListModelSource | string,
    target: DropListModelSource | string,
    newOrderedIds: string[],
  ): void {
    const isSrcRegularList = src === 'DONE' || src === 'UNDONE';
    const isTargetRegularList = target === 'DONE' || target === 'UNDONE';
    const workContextId = this._workContextService.activeWorkContextId as string;

    if (isSrcRegularList && isTargetRegularList) {
      // move inside today
      const workContextType = this._workContextService
        .activeWorkContextType as WorkContextType;
      this._store.dispatch(
        moveTaskInTodayList({
          taskId,
          newOrderedIds,
          src,
          target,
          workContextId,
          workContextType,
        }),
      );
    } else if (src === 'BACKLOG' && target === 'BACKLOG') {
      // move inside backlog
      this._store.dispatch(
        moveProjectTaskInBacklogList({ taskId, newOrderedIds, workContextId }),
      );
    } else if (src === 'BACKLOG' && isTargetRegularList) {
      // move from backlog to today
      this._store.dispatch(
        moveProjectTaskToRegularList({
          taskId,
          newOrderedIds,
          src,
          target,
          workContextId,
        }),
      );
    } else if (isSrcRegularList && target === 'BACKLOG') {
      // move from today to backlog
      this._store.dispatch(
        moveProjectTaskToBacklogList({ taskId, newOrderedIds, workContextId }),
      );
    } else {
      // move sub task
      this._store.dispatch(
        moveSubTask({ taskId, srcTaskId: src, targetTaskId: target, newOrderedIds }),
      );
    }
  }

  expandDoneTasks(): void {
    const pid = this.parentId();
    if (!pid) {
      throw new Error('Parent ID is undefined');
    }

    this._taskService.showSubTasks(pid);
    this._taskService.focusTask(pid);
  }
}
