import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { LS } from '../../../core/persistence/storage-keys.const';
import { blendInOutAnimation } from 'src/app/ui/animations/blend-in-out.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { TaskCopy } from '../task.model';
import { AddTaskBarAddModeComponent } from './add-task-bar-add-mode/add-task-bar-add-mode.component';
import { AddTaskBarSearchModeComponent } from './add-task-bar-search-mode/add-task-bar-search-mode.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [blendInOutAnimation, fadeAnimation],
  imports: [AddTaskBarAddModeComponent, AddTaskBarSearchModeComponent, AsyncPipe],
})
export class AddTaskBarComponent {
  tabindex = input<number>(0);
  isElevated = input<boolean>(false);
  isDisableAutoFocus = input<boolean>(false);
  planForDay = input<string | undefined>(undefined);
  additionalFields = input<Partial<TaskCopy>>();
  taskIdsToExclude = input<string[]>();

  afterTaskAdd = output<{ taskId: string; isAddToBottom: boolean }>();
  blurred = output<void>();
  done = output<void>();

  isAddToBottom = signal(
    JSON.parse(localStorage.getItem(LS.IS_ADD_TO_BOTTOM) || 'false'),
  );
  isAddToBacklog = signal(false);

  mode = signal<'add' | 'search'>('add');

  switchToSearchMode(): void {
    this.mode.set('search');
  }

  switchToAddMode(): void {
    this.mode.set('add');
  }

  onAfterTaskAdd(event: { taskId: string; isAddToBottom: boolean }): void {
    this.afterTaskAdd.emit(event);
    if (this.mode() === 'search') {
      this.mode.set('add');
    }
  }

  onBlurred(): void {
    this.blurred.emit();
  }

  toggleIsAddToBottom(): void {
    this.isAddToBottom.set(!this.isAddToBottom());
    localStorage.setItem(LS.IS_ADD_TO_BOTTOM, JSON.stringify(this.isAddToBottom()));
  }

  toggleIsAddToBacklog(): void {
    this.isAddToBacklog.set(!this.isAddToBacklog());
  }
}
