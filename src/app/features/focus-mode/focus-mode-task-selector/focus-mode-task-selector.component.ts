import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { SelectTaskComponent } from '../../tasks/select-task/select-task.component';
import { Task } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { fadeAnimation } from '../../../ui/animations/fade.ani';

@Component({
  selector: 'focus-mode-task-selector',
  templateUrl: './focus-mode-task-selector.component.html',
  styleUrls: ['./focus-mode-task-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  imports: [SelectTaskComponent, MatButton, TranslatePipe],
})
export class FocusModeTaskSelectorComponent implements AfterViewInit, OnDestroy {
  private readonly _taskService = inject(TaskService);

  readonly taskSelected = output<string>();
  readonly closed = output<void>();

  currentTaskInputText = signal<string>('');

  @ViewChild(SelectTaskComponent, { read: ElementRef })
  selectTaskElementRef?: ElementRef;

  private inputElement?: HTMLInputElement;
  private keydownHandler?: (event: KeyboardEvent) => void;

  ngAfterViewInit(): void {
    // Focus the input after view initialization
    setTimeout(() => {
      this.inputElement =
        this.selectTaskElementRef?.nativeElement?.querySelector('input');
      if (this.inputElement) {
        this.inputElement.focus();
        // Add keydown listener directly to input for Enter key handling
        this.keydownHandler = (event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            // Check if autocomplete panel is open
            const autocompletePanel = document.querySelector('.mat-autocomplete-panel');
            const isPanelVisible =
              autocompletePanel &&
              window.getComputedStyle(autocompletePanel).visibility !== 'hidden';

            // Only create task if autocomplete is not visible
            if (!isPanelVisible) {
              event.preventDefault();
              this.createAndSelectTaskFromInput();
            }
          }
        };
        this.inputElement.addEventListener('keydown', this.keydownHandler, {
          capture: true,
        });
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // Clean up event listener
    if (this.inputElement && this.keydownHandler) {
      this.inputElement.removeEventListener('keydown', this.keydownHandler);
    }
  }

  onTaskChange(taskOrString: Task | string | null): void {
    // Track text input for later use
    if (typeof taskOrString === 'string') {
      this.currentTaskInputText.set(taskOrString);
      return; // Don't create task yet - wait for Enter or button click
    }

    // Task object selected from autocomplete
    if (taskOrString && typeof taskOrString === 'object') {
      this.taskSelected.emit(taskOrString.id);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    // Only handle Escape to close the overlay
    // Let the autocomplete and input handle all other keys naturally
    if (event.key === 'Escape') {
      this.close();
    }
  }

  createAndSelectTaskFromInput(): void {
    const taskTitle = this.currentTaskInputText().trim();
    if (taskTitle) {
      const newTaskId = this._taskService.add(taskTitle, false, {});
      this.taskSelected.emit(newTaskId);
    }
  }

  close(): void {
    this.closed.emit();
  }
}
