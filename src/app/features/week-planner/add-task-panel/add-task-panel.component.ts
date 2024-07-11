import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllTasks } from '../../tasks/store/task.selectors';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TaskCopy } from '../../tasks/task.model';
import { ADD_TASK_PANEL_ID } from '../week-planner.model';
import { WeekPlannerActions } from '../store/week-planner.actions';

@Component({
  selector: 'add-task-panel',
  templateUrl: './add-task-panel.component.html',
  styleUrl: './add-task-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskPanelComponent {
  @Output() closePanel = new EventEmitter<void>();

  ADD_TASK_PANEL = ADD_TASK_PANEL_ID;
  allTasks$ = this._store.select(selectAllTasks);

  constructor(private _store: Store) {}

  drop(ev: CdkDragDrop<string, string, TaskCopy>): void {
    const t = ev.item.data;

    // TODO scheduled task case
    if (t.reminderId) {
    } else {
      this._store.dispatch(
        WeekPlannerActions.transferTask({
          tId: t.id,
          prevDay: ev.previousContainer.data,
          newDay: ADD_TASK_PANEL_ID,
          targetIndex: ev.currentIndex,
        }),
      );
    }
  }
}
