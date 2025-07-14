import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { PlannerTaskComponent } from '../../planner/planner-task/planner-task.component';
import {
  BoardPanelCfg,
  BoardPanelCfgScheduledState,
  BoardPanelCfgTaskDoneState,
  BoardPanelCfgTaskTypeFilter,
  BoardPanelSortField,
  BoardPanelSortDirection,
  BoardPanelSortCfg,
  BoardPanelGroupField,
  BoardPanelGroupCfg,
} from '../boards.model';
import { select, Store } from '@ngrx/store';
import {
  selectAllTasksWithoutHiddenProjects,
  selectTaskById,
  selectTaskByIdWithSubTaskData,
} from '../../tasks/store/task.selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import { AddTaskInlineComponent } from '../../planner/add-task-inline/add-task-inline.component';
import { T } from '../../../t.const';
import { TaskCopy } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';
import { BoardsActions } from '../store/boards.actions';
import { moveItemInArray } from '../../../util/move-item-in-array';
import { unique } from '../../../util/unique';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { LocalDateStrPipe } from '../../../ui/pipes/local-date-str.pipe';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatSelect, MatOption } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogScheduleTaskComponent } from '../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { MatDialog } from '@angular/material/dialog';
import { fastArrayCompare } from '../../../util/fast-array-compare';
import { first, take } from 'rxjs/operators';
import { ShortPlannedAtPipe } from '../../../ui/pipes/short-planned-at.pipe';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { selectUnarchivedVisibleProjects } from '../../project/store/project.selectors';

export interface TaskGroup {
  key: string;
  title: string;
  tasks: TaskCopy[];
  collapsed: boolean;
}

@Component({
  selector: 'board-panel',
  standalone: true,
  imports: [
    CdkDrag,
    PlannerTaskComponent,
    CdkDropList,
    AddTaskInlineComponent,
    LocalDateStrPipe,
    MatIcon,
    MatIconButton,
    MatSelect,
    MatOption,
    TranslatePipe,
    ShortPlannedAtPipe,
    MsToStringPipe,
  ],
  templateUrl: './board-panel.component.html',
  styleUrl: './board-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardPanelComponent {
  T = T;

  panelCfg = input.required<BoardPanelCfg>();
  editBoard = output<void>();

  store = inject(Store);
  taskService = inject(TaskService);
  _matDialog = inject(MatDialog);

  // Sort-related signals
  currentSortField = signal<BoardPanelSortField>(
    this.panelCfg?.sortCfg?.field ?? BoardPanelSortField.None
  );
  currentSortDirection = signal<BoardPanelSortDirection>(
    this.panelCfg?.sortCfg?.direction ?? BoardPanelSortDirection.Asc
  );

  // Group-related signals
  currentGroupField = signal<BoardPanelGroupField>(
    this.panelCfg?.groupCfg?.field ?? BoardPanelGroupField.None
  );
  collapsedGroups = signal<Set<string>>(new Set());

  allTasks$ = this.store.select(selectAllTasksWithoutHiddenProjects);
  allTasks = toSignal(this.allTasks$, {
    initialValue: [],
  });

  allProjects$ = this.store.select(selectUnarchivedVisibleProjects);
  allProjects = toSignal(this.allProjects$, {
    initialValue: [],
  });

  // Create a Set of all backlog task IDs for fast lookup
  allBacklogTaskIds = computed(() => {
    const backlogIds = new Set<string>();
    for (const project of this.allProjects()) {
      if (project && project.backlogTaskIds && Array.isArray(project.backlogTaskIds)) {
        project.backlogTaskIds.forEach((id) => backlogIds.add(id));
      }
    }
    return backlogIds;
  });

  totalEstimate = computed(() =>
    this.tasks().reduce((acc, task) => acc + (task.timeEstimate || 0), 0),
  );

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
      ...(panelCfg.projectId && panelCfg.projectId.length
        ? { projectId: panelCfg.projectId }
        : {}),
      // TODO scheduledState
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

      if (panelCfg.isParentTasksOnly) {
        isTaskIncluded = isTaskIncluded && !task.parentId;
      }

      if (panelCfg.taskDoneState === BoardPanelCfgTaskDoneState.Done) {
        isTaskIncluded = isTaskIncluded && task.isDone;
      }

      if (panelCfg.taskDoneState === BoardPanelCfgTaskDoneState.UnDone) {
        isTaskIncluded = isTaskIncluded && !task.isDone;
      }

      if (panelCfg.projectId) {
        // TODO check parentId case thoroughly
        isTaskIncluded = isTaskIncluded && task.projectId === panelCfg.projectId;
      }

      if (panelCfg.scheduledState === BoardPanelCfgScheduledState.Scheduled) {
        isTaskIncluded = isTaskIncluded && !!(task.dueWithTime || task.dueDay);
      }

      if (panelCfg.scheduledState === BoardPanelCfgScheduledState.NotScheduled) {
        isTaskIncluded = isTaskIncluded && !task.dueWithTime && !task.dueDay;
      }

      if (panelCfg.backlogState === BoardPanelCfgTaskTypeFilter.OnlyBacklog) {
        isTaskIncluded = isTaskIncluded && this._isTaskInBacklog(task);
      }

      if (panelCfg.backlogState === BoardPanelCfgTaskTypeFilter.NoBacklog) {
        isTaskIncluded = isTaskIncluded && !this._isTaskInBacklog(task);
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
    
    let finalTasks = [...orderedTasks, ...nonOrderedTasks].filter((t) => !!t);
    
    // Apply sorting if configured
    const sortCfg = panelCfg.sortCfg || {
      primary: this.currentSortField(),
      direction: this.currentSortDirection()
    };
    
    if (sortCfg.primary !== BoardPanelSortField.None) {
      finalTasks = this._sortTasks(finalTasks, sortCfg);
    }
    
    return finalTasks;
  });

  taskGroups = computed(() => {
    const groupField = this.currentGroupField();
    const tasks = this.tasks();
    const collapsedGroups = this.collapsedGroups();

    if (groupField === BoardPanelGroupField.None) {
      return [];
    }

    return this._groupTasks(tasks, groupField, collapsedGroups);
  });

  async drop(ev: CdkDragDrop<BoardPanelCfg, string, TaskCopy>): Promise<void> {
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

    const updates: Partial<TaskCopy> = {};

    // conditional updates
    if (!fastArrayCompare(task.tagIds, newTagIds)) {
      this.taskService.updateTags(task, unique(newTagIds));
    }
    if (panelCfg.taskDoneState === BoardPanelCfgTaskDoneState.Done && !task.isDone) {
      updates.isDone = true;
    } else if (
      panelCfg.taskDoneState === BoardPanelCfgTaskDoneState.UnDone &&
      task.isDone
    ) {
      updates.isDone = false;
    }

    if (panelCfg.projectId?.length && task.projectId !== panelCfg.projectId) {
      const taskWithSubTasks = await this.store
        .pipe(
          select(selectTaskByIdWithSubTaskData, { id: task.parentId || task.id }),
          take(1),
        )
        .toPromise();

      this.store.dispatch(
        TaskSharedActions.moveToOtherProject({
          task: taskWithSubTasks,
          targetProjectId: panelCfg.projectId,
        }),
      );
    }

    if (Object.keys(updates).length > 0) {
      this.store.dispatch(
        TaskSharedActions.updateTask({ task: { id: task.id, changes: updates } }),
      );
    }

    this.store.dispatch(
      BoardsActions.updatePanelCfgTaskIds({
        panelId: panelCfg.id,
        taskIds,
      }),
    );

    this._checkToScheduledTask(panelCfg, task.id);
  }

  async afterTaskAdd({
    taskId,
    isAddToBottom,
  }: {
    taskId: string;
    isAddToBottom: boolean;
  }): Promise<void> {
    const panelCfg = this.panelCfg();
    this.store.dispatch(
      BoardsActions.updatePanelCfgTaskIds({
        panelId: panelCfg.id,
        taskIds: isAddToBottom
          ? [...panelCfg.taskIds, taskId]
          : [taskId, ...panelCfg.taskIds],
      }),
    );

    this._checkToScheduledTask(panelCfg, taskId);
  }

  scheduleTask(task: TaskCopy, ev?: MouseEvent): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    this._matDialog.open(DialogScheduleTaskComponent, {
      restoreFocus: true,
      data: { task },
    });
  }

  private async _checkToScheduledTask(
    panelCfg: BoardPanelCfg,
    taskId: string,
  ): Promise<void> {
    if (panelCfg.scheduledState === BoardPanelCfgScheduledState.Scheduled) {
      const task = await this.store
        .select(selectTaskById, { id: taskId })
        .pipe(first())
        .toPromise();
      if (!task.dueDay && !task.dueWithTime) {
        this.scheduleTask(task);
      }
    }
    if (panelCfg.scheduledState === BoardPanelCfgScheduledState.NotScheduled) {
      const task = await this.store
        .select(selectTaskById, { id: taskId })
        .pipe(first())
        .toPromise();

      this.store.dispatch(
        TaskSharedActions.unscheduleTask({
          id: taskId,
          reminderId: task.reminderId,
          isSkipToast: false,
        }),
      );
    }
  }

  // Sort-related methods
  onSortFieldChange(field: BoardPanelSortField): void {
    this.currentSortField.set(field);
    this._updatePanelSortConfig();
  }

  toggleSortDirection(): void {
    const newDirection = this.currentSortDirection() === BoardPanelSortDirection.Asc 
      ? BoardPanelSortDirection.Desc 
      : BoardPanelSortDirection.Asc;
    this.currentSortDirection.set(newDirection);
    this._updatePanelSortConfig();
  }

  private _updatePanelSortConfig(): void {
    const panelCfg = this.panelCfg();
    const sortCfg: BoardPanelSortCfg = {
      primary: this.currentSortField(),
      direction: this.currentSortDirection()
    };

    this.store.dispatch(
      BoardsActions.updatePanelSortConfig({
        panelId: panelCfg.id,
        sortCfg
      })
    );
  }

  // Group-related methods
  onGroupFieldChange(field: BoardPanelGroupField): void {
    this.currentGroupField.set(field);
    this._updatePanelGroupConfig();
  }

  toggleGroupCollapse(groupKey: string): void {
    const collapsed = this.collapsedGroups();
    const newCollapsed = new Set(collapsed);
    
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey);
    } else {
      newCollapsed.add(groupKey);
    }
    
    this.collapsedGroups.set(newCollapsed);
  }

  getGroupEstimate(tasks: TaskCopy[]): number {
    return tasks.reduce((acc, task) => acc + (task.timeEstimate || 0), 0);
  }

  private _updatePanelGroupConfig(): void {
    const panelCfg = this.panelCfg();
    const groupCfg: BoardPanelGroupCfg = {
      field: this.currentGroupField(),
      showUngrouped: true,
      collapseGroups: false
    };

    this.store.dispatch(
      BoardsActions.updatePanelGroupConfig({
        panelId: panelCfg.id,
        groupCfg
      })
    );
  }

  private _groupTasks(tasks: TaskCopy[], groupField: BoardPanelGroupField, collapsedGroups: Set<string>): TaskGroup[] {
    const groups = new Map<string, TaskCopy[]>();

    // Group tasks by the specified field
    tasks.forEach(task => {
      const groupKeys = this._getTaskGroupKeys(task, groupField);
      
      groupKeys.forEach(key => {
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(task);
      });
    });

    // Convert to TaskGroup array and sort
    const taskGroups: TaskGroup[] = Array.from(groups.entries()).map(([key, groupTasks]) => ({
      key,
      title: this._getGroupTitle(key, groupField),
      tasks: groupTasks,
      collapsed: collapsedGroups.has(key)
    }));

    // Sort groups by title
    taskGroups.sort((a, b) => a.title.localeCompare(b.title));

    return taskGroups;
  }

  private _getTaskGroupKeys(task: TaskCopy, groupField: BoardPanelGroupField): string[] {
    switch (groupField) {
      case BoardPanelGroupField.Tags:
        return task.tagIds.length > 0 ? task.tagIds : ['no-tags'];
        
      case BoardPanelGroupField.Project:
        return task.projectId ? [task.projectId] : ['no-project'];
        
      case BoardPanelGroupField.Priority:
        const priority = task.priority || 0;
        if (priority >= 3) return ['high-priority'];
        if (priority >= 1) return ['medium-priority'];
        return ['low-priority'];
        
      case BoardPanelGroupField.DueDateRange:
        const now = Date.now();
        const today = new Date(now).setHours(0, 0, 0, 0);
        const tomorrow = today + 24 * 60 * 60 * 1000;
        const nextWeek = today + 7 * 24 * 60 * 60 * 1000;
        
        const dueDate = task.dueWithTime || task.dueDay;
        if (!dueDate) return ['no-due-date'];
        
        if (dueDate < today) return ['overdue'];
        if (dueDate < tomorrow) return ['today'];
        if (dueDate < nextWeek) return ['this-week'];
        return ['later'];
        
      case BoardPanelGroupField.TimeEstimateRange:
        const estimate = task.timeEstimate || 0;
        const estimateHours = estimate / (60 * 60 * 1000);
        
        if (estimate === 0) return ['no-estimate'];
        if (estimateHours < 0.5) return ['quick-tasks'];
        if (estimateHours < 2) return ['medium-tasks'];
        return ['long-tasks'];
        
      default:
        return ['ungrouped'];
    }
  }

  private _getGroupTitle(key: string, groupField: BoardPanelGroupField): string {
    switch (groupField) {
      case BoardPanelGroupField.Tags:
        if (key === 'no-tags') return 'No Tags';
        // TODO: Get actual tag name from tag service
        return `Tag: ${key}`;
        
      case BoardPanelGroupField.Project:
        if (key === 'no-project') return 'No Project';
        // TODO: Get actual project name from project service
        return `Project: ${key}`;
        
      case BoardPanelGroupField.Priority:
        switch (key) {
          case 'high-priority': return 'High Priority';
          case 'medium-priority': return 'Medium Priority';
          case 'low-priority': return 'Low Priority';
          default: return 'Unknown Priority';
        }
        
      case BoardPanelGroupField.DueDateRange:
        switch (key) {
          case 'overdue': return 'Overdue';
          case 'today': return 'Today';
          case 'this-week': return 'This Week';
          case 'later': return 'Later';
          case 'no-due-date': return 'No Due Date';
          default: return 'Unknown';
        }
        
      case BoardPanelGroupField.TimeEstimateRange:
        switch (key) {
          case 'quick-tasks': return 'Quick Tasks (<30min)';
          case 'medium-tasks': return 'Medium Tasks (30min-2h)';
          case 'long-tasks': return 'Long Tasks (>2h)';
          case 'no-estimate': return 'No Estimate';
          default: return 'Unknown';
        }
        
      default:
        return key;
    }
  }

  private _sortTasks(tasks: TaskCopy[], sortCfg: BoardPanelSortCfg): TaskCopy[] {
    return [...tasks].sort((a, b) => {
      const result = this._compareTasksByField(a, b, sortCfg.primary);
      const multiplier = sortCfg.direction === BoardPanelSortDirection.Asc ? 1 : -1;
      
      if (result !== 0) {
        return result * multiplier;
      }
      
      // Secondary sort if primary values are equal
      if (sortCfg.secondary) {
        const secondaryResult = this._compareTasksByField(a, b, sortCfg.secondary.field);
        const secondaryMultiplier = sortCfg.secondary.direction === BoardPanelSortDirection.Asc ? 1 : -1;
        return secondaryResult * secondaryMultiplier;
      }
      
      return 0;
    });
  }

  private _compareTasksByField(a: TaskCopy, b: TaskCopy, field: BoardPanelSortField): number {
    switch (field) {
      case BoardPanelSortField.DueDate:
        const aDue = a.dueWithTime || a.dueDay || Number.MAX_SAFE_INTEGER;
        const bDue = b.dueWithTime || b.dueDay || Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
        
      case BoardPanelSortField.TimeEstimate:
        const aEstimate = a.timeEstimate || 0;
        const bEstimate = b.timeEstimate || 0;
        return aEstimate - bEstimate;
        
      case BoardPanelSortField.Priority:
        // Assuming higher priority values mean higher priority
        const aPriority = a.priority || 0;
        const bPriority = b.priority || 0;
        return bPriority - aPriority; // Higher priority first
        
      case BoardPanelSortField.CreatedAt:
        return a.createdAt - b.createdAt;
        
      case BoardPanelSortField.Title:
        return a.title.localeCompare(b.title);
        
      case BoardPanelSortField.Project:
        const aProject = a.projectId || '';
        const bProject = b.projectId || '';
        return aProject.localeCompare(bProject);
        
      default:
        return 0;
    }
  }

  _isTaskInBacklog(task: Readonly<TaskCopy>): boolean {
    return this.allBacklogTaskIds().has(task.id);
  }
}
