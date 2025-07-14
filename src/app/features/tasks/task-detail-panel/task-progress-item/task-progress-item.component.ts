import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { Task } from '../../task.model';
import { TaskService } from '../../task.service';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'task-progress-item',
  standalone: true,
  imports: [
    CommonModule,
    MatSliderModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
  ],
  template: `
    <div class="progress-container">
      <div class="progress-header">
        <mat-icon class="progress-icon">trending_up</mat-icon>
        <span class="progress-label">Progress</span>
        <span class="progress-percentage">{{ task?.progress || 0 }}%</span>
      </div>

      <div class="progress-controls">
        <mat-slider
          class="progress-slider"
          [min]="0"
          [max]="100"
          [step]="5"
          [value]="task?.progress || 0"
          (valueChange)="onSliderChange($event)"
          [disabled]="task?.isDone"
        >
          <input
            matSliderThumb
            [value]="task?.progress || 0"
          />
        </mat-slider>

        <div class="progress-input-wrapper">
          <mat-form-field
            appearance="outline"
            class="progress-input"
          >
            <input
              matInput
              type="number"
              min="0"
              max="100"
              [value]="task?.progress || 0"
              (input)="onInputChange($event)"
              [disabled]="task?.isDone"
              placeholder="0"
            />
            <span matTextSuffix>%</span>
          </mat-form-field>
        </div>
      </div>

      <div class="progress-bar-visual">
        <div class="progress-bar-bg">
          <div
            class="progress-bar-fill"
            [style.width.%]="task?.progress || 0"
          ></div>
        </div>
      </div>

      @if (task?.isDone) {
        <div class="progress-completed-note">
          <mat-icon>check_circle</mat-icon>
          <span>Task completed</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .progress-container {
        padding: 16px;
        border-radius: 8px;
        background: var(--card-bg);
        margin: 8px 0;
      }

      .progress-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
      }

      .progress-icon {
        color: var(--primary);
      }

      .progress-label {
        flex: 1;
        font-weight: 500;
      }

      .progress-percentage {
        font-weight: 600;
        color: var(--primary);
        font-size: 1.1em;
      }

      .progress-controls {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }

      .progress-slider {
        flex: 1;
        --mdc-slider-active-track-color: var(--primary);
        --mdc-slider-inactive-track-color: var(--primary-lighter);
        --mdc-slider-handle-color: var(--primary);
      }

      .progress-input-wrapper {
        min-width: 80px;
      }

      .progress-input {
        width: 100%;
      }

      .progress-input .mat-mdc-form-field-wrapper {
        padding-bottom: 0;
      }

      .progress-input .mat-mdc-text-field-wrapper {
        height: 40px;
      }

      .progress-bar-visual {
        margin-top: 8px;
      }

      .progress-bar-bg {
        height: 8px;
        background: var(--primary-lighter);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        border-radius: 4px;
        transition: width 0.3s ease;
      }

      .progress-completed-note {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        padding: 8px;
        background: var(--success-bg, #e8f5e8);
        color: var(--success-text, #2e7d32);
        border-radius: 4px;
        font-size: 0.9em;
      }

      .progress-completed-note mat-icon {
        color: var(--success-text, #2e7d32);
      }

      /* Disabled state */
      .progress-slider[disabled] {
        opacity: 0.6;
      }

      .progress-input[disabled] {
        opacity: 0.6;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskProgressItemComponent {
  @Input() task: Task | null = null;
  @Output() progressChange = new EventEmitter<number>();

  constructor(private taskService: TaskService) {}

  onSliderChange(value: number | null): void {
    if (value !== null && this.task && !this.task.isDone) {
      this.updateProgress(value);
    }
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value, 10);

    if (!isNaN(value) && value >= 0 && value <= 100 && this.task && !this.task.isDone) {
      this.updateProgress(value);
    }
  }

  private updateProgress(progress: number): void {
    if (!this.task) return;

    // Clamp progress between 0 and 100
    const clampedProgress = Math.max(0, Math.min(100, progress));

    this.taskService.update(this.task.id, { progress: clampedProgress });
    this.progressChange.emit(clampedProgress);
  }
}
