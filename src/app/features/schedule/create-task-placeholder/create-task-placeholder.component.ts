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
  signal,
  Signal,
  ViewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TaskService } from '../../tasks/task.service';
import { TaskReminderOptionId } from '../../tasks/task.model';
import { DatePipe } from '@angular/common';
import { PlannerActions } from '../../planner/store/planner.actions';
import { Store } from '@ngrx/store';
import { getWorklogStr } from '../../../util/get-work-log-str';

@Component({
  selector: 'create-task-placeholder',
  standalone: true,
  imports: [MatIcon, DatePipe],
  templateUrl: './create-task-placeholder.component.html',
  styleUrl: './create-task-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTaskPlaceholderComponent implements OnDestroy {
  isEditMode = input.required<boolean>();
  time = input<string>();
  date = input<string>();
  isForDayMode = signal<boolean>(false);
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

  constructor(
    private _taskService: TaskService,
    private _store: Store,
  ) {
    effect(() => {
      if (this.isEditMode()) {
        this.textAreaElement?.nativeElement.focus();
      }
    });
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._editEndTimeout);
    // otherwise the element  might not reappear always
    this.editEnd.emit();
  }

  onBlur(): void {
    window.clearTimeout(this._editEndTimeout);
    this._editEndTimeout = window.setTimeout(() => this.editEnd.emit(), 200);
  }

  async onKeyDown(event: KeyboardEvent): Promise<void> {
    if (
      event.key === 'Enter' &&
      typeof this.plannedAt() === 'number' &&
      this.textAreaElement?.nativeElement.value
    ) {
      this.editEnd.emit();
      if (this.isForDayMode()) {
        const id = this._taskService.add(
          this.textAreaElement?.nativeElement.value || '',
          false,
          {
            timeEstimate: 30 * 60 * 1000,
          },
        );
        const task = await this._taskService.getByIdOnce$(id).toPromise();
        this._store.dispatch(
          PlannerActions.planTaskForDay({
            task: task,
            day: getWorklogStr(this.plannedAt()),
          }),
        );
      } else {
        this._taskService.addAndSchedule(
          this.textAreaElement?.nativeElement.value || '',
          {
            timeEstimate: 30 * 60 * 1000,
          },
          this.plannedAt(),
          TaskReminderOptionId.AtStart,
        );
      }
    } else if (event.key === 'Escape') {
      this.editEnd.emit();
    } else if (event.key === '1' && event.ctrlKey) {
      this.isForDayMode.set(!this.isForDayMode());
    }
  }

  private _formatTimeWithLeadingZero(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
