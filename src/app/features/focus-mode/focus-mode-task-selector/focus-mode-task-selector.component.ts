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
import { MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'focus-mode-task-selector',
  templateUrl: './focus-mode-task-selector.component.html',
  styleUrls: ['./focus-mode-task-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  imports: [SelectTaskComponent, MatIconButton, MatIcon, MatMiniFabButton],
})
export class FocusModeTaskSelectorComponent implements AfterViewInit, OnDestroy {
  private readonly _taskService = inject(TaskService);

  readonly taskSelected = output<string>();
  readonly closed = output<void>();

  currentTaskInputText = signal<string>('');

  @ViewChild(SelectTaskComponent, { read: ElementRef })
  selectTaskElementRef?: ElementRef;
  @ViewChild(SelectTaskComponent)
  selectTaskComponent?: SelectTaskComponent;

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
            const isPanelVisible =
              this.selectTaskComponent?.isAutocompletePanelOpen() ?? false;

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
      this.currentTaskInputText.set('');
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
      this.currentTaskInputText.set('');
    }
  }

  close(): void {
    this.closed.emit();
  }
}
