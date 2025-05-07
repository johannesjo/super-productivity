import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  OnDestroy,
  viewChild,
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
import { moveSubTask, updateTask } from '../store/task.actions';
import { WorkContextService } from '../../work-context/work-context.service';
import { Store } from '@ngrx/store';
import { moveItemBeforeItem } from '../../../util/move-item-before-item';
import { DropListService } from '../../../core-ui/drop-list/drop-list.service';
import { IssueService } from '../../issue/issue.service';
import { SearchResultItem } from '../../issue/issue.model';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TaskComponent } from '../task/task.component';
import { AsyncPipe } from '@angular/common';
import { planTasksForToday } from '../../tag/store/tag.actions';

export type TaskListId = 'PARENT' | 'SUB';
export type ListModelId = DropListModelSource | string;
const PARENT_ALLOWED_LISTS = ['DONE', 'UNDONE', 'OVERDUE', 'BACKLOG', 'ADD_TASK_PANEL'];

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
  imports: [
    MatButton,
    MatIcon,
    CdkDropList,
    CdkDrag,
    AsyncPipe,
    forwardRef(() => TaskComponent),
  ],
})
export class TaskListComponent implements OnDestroy, AfterViewInit {
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);
  private _store = inject(Store);
  private _issueService = inject(IssueService);
  dropListService = inject(DropListService);

  tasks = input<TaskWithSubTasks[]>([]);
  isHideDone = input(false);
  isHideAll = input(false);
  isSortingDisabled = input(false);

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

  readonly dropList = viewChild(CdkDropList);

  T: typeof T = T;

  ngAfterViewInit(): void {
    this.dropListService.registerDropList(this.dropList()!, this.listId() === 'SUB');
  }

  ngOnDestroy(): void {
    this.dropListService.unregisterDropList(this.dropList()!);
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
    if (targetModelId === 'OVERDUE') {
      return false;
    } else if (isSubtask) {
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
    ev: CdkDragDrop<
      DropModelDataForList,
      DropModelDataForList | string,
      TaskWithSubTasks | SearchResultItem
    >,
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

    if ('issueData' in draggedTask) {
      return this._addFromIssuePanel(draggedTask, srcListData as string);
    } else if (typeof srcListData === 'string') {
      throw new Error('Should not happen 2');
    }

    if (targetTask && targetTask.id === draggedTask.id) {
      return;
    }

    const newIds =
      targetTask && targetTask.id !== draggedTask.id
        ? [
            ...moveItemBeforeItem(
              targetListData.filteredTasks,
              draggedTask,
              targetTask as TaskWithSubTasks,
            ),
          ]
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

  async _addFromIssuePanel(
    item: SearchResultItem,
    issueProviderId: string,
  ): Promise<void> {
    if (!item.issueType || !item.issueData || !issueProviderId) {
      throw new Error('No issueData');
    }

    await this._issueService.addTaskFromIssue({
      issueDataReduced: item.issueData,
      issueProviderId: issueProviderId,
      issueProviderKey: item.issueType,
    });
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
    } else if (target === 'OVERDUE') {
      return;
    } else if (src === 'OVERDUE' && (target === 'UNDONE' || target === 'DONE')) {
      const workContextType = this._workContextService
        .activeWorkContextType as WorkContextType;
      this._store.dispatch(planTasksForToday({ taskIds: [taskId] }));
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
      if (target === 'DONE') {
        this._store.dispatch(
          updateTask({
            task: { id: taskId, changes: { isDone: true } },
          }),
        );
      }
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
    // note this might be executed from the task detail panel, where this is not possible
    this._taskService.focusTaskIfPossible(pid);
  }
}
