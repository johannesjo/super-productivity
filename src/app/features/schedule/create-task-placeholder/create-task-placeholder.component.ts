import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  HostListener,
  input,
  OnDestroy,
  output,
  Signal,
  ViewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TaskService } from '../../tasks/task.service';
import { TaskReminderOptionId } from '../../tasks/task.model';

@Component({
  selector: 'create-task-placeholder',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './create-task-placeholder.component.html',
  styleUrl: './create-task-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTaskPlaceholderComponent implements OnDestroy {
  isEditMode = input.required<boolean>();
  time = input<string>();
  date = input<string>();
  plannedAt: Signal<number> = computed(() => {
    if (this.date() && this.time()) {
      // console.log(this.date(), this.time());
      const formattedTime = this._formatTimeWithLeadingZero(this.time() as string);
      return new Date(`${this.date()}T${formattedTime}`).getTime();
    }
    return 0;
  });

  // time = computed(() => {})
  editEnd = output<void>();

  @ViewChild('textAreaElement', { static: true, read: ElementRef })
  textAreaElement?: ElementRef<HTMLTextAreaElement>;

  private _editEndTimeout: number | undefined;

  @HostBinding('class.isEditMode')
  get isEditModeClass(): boolean {
    return this.isEditMode();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.textAreaElement?.nativeElement.focus();
    // cancel blur
    window.clearTimeout(this._editEndTimeout);
  }

  constructor(private _taskService: TaskService) {
    effect(() => {
      if (this.isEditMode()) {
        this.textAreaElement?.nativeElement.focus();
      }
    });
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._editEndTimeout);
  }

  onBlur(): void {
    window.clearTimeout(this._editEndTimeout);
    this._editEndTimeout = window.setTimeout(() => this.editEnd.emit(), 200);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (
      event.key === 'Enter' &&
      typeof this.plannedAt() === 'number' &&
      this.textAreaElement?.nativeElement.value
    ) {
      console.log(this.plannedAt());

      this.editEnd.emit();
      this._taskService.addAndSchedule(
        this.textAreaElement?.nativeElement.value || '',
        {
          timeEstimate: 30 * 60 * 1000,
        },
        this.plannedAt(),
        TaskReminderOptionId.AtStart,
      );
    }
  }

  private _formatTimeWithLeadingZero(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
