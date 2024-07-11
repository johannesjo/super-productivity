import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllTasks } from '../../tasks/store/task.selectors';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TaskCopy } from '../../tasks/task.model';

@Component({
  selector: 'add-task-panel',
  templateUrl: './add-task-panel.component.html',
  styleUrl: './add-task-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskPanelComponent {
  @Output() closePanel = new EventEmitter<void>();

  allTasks$ = this.store.select(selectAllTasks);

  constructor(private store: Store) {}

  drop(event: CdkDragDrop<TaskCopy[]>): void {
    //TODO implement remove from list
  }
}
