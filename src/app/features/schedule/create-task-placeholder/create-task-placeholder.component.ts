import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  Signal,
  viewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TaskService } from '../../tasks/task.service';
import { Task, TaskReminderOptionId } from '../../tasks/task.model';
import { DatePipe } from '@angular/common';
import { PlannerActions } from '../../planner/store/planner.actions';
import { Store } from '@ngrx/store';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { ShortTime2Pipe } from '../../../ui/pipes/short-time2.pipe';
import { SelectTaskMinimalComponent } from '../../tasks/select-task/select-task-minimal/select-task-minimal.component';
import { devError } from '../../../util/dev-error';

@Component({
  selector: 'create-task-placeholder',
  imports: [MatIcon, DatePipe, ShortTime2Pipe, SelectTaskMinimalComponent],
  templateUrl: './create-task-placeholder.component.html',
  styleUrl: './create-task-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTaskPlaceholderComponent implements OnDestroy {
  private _taskService = inject(TaskService);
  private _store = inject(Store);

  isEditMode = input.required<boolean>();
  time = input<string>();
  date = input<string>();

  // Task selection state
  selectedTask = signal<Task | null>(null);
  newTaskTitle = signal<string>('');
  isCreate = signal<boolean>(false);
  isForDayMode = signal<boolean>(false);
  due: Signal<number> = computed(() => {
    if (this.date() && this.time()) {
      // Log.log(this.date(), this.time());
      const formattedTime = this._formatTimeWithLeadingZero(this.time() as string);
      return new Date(`${this.date()}T${formattedTime}`).getTime();
    }
    return 0;
  });

  // time = computed(() => {})
  editEnd = output<void>();

  readonly selectTaskMinimal = viewChild('selectTaskMinimal', { read: ElementRef });

  private _editEndTimeout: number | undefined;

  @HostBinding('class.edit-mode')
  get isEditModeClass(): boolean {
    return this.isEditMode();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    event.stopPropagation();
    this._focusSelectTaskMinimal();
    window.clearTimeout(this._editEndTimeout);
  }

  constructor() {
    effect(() => {
      if (this.isEditMode()) {
        this._focusSelectTaskMinimal();
      }
    });
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._editEndTimeout);
    this.editEnd.emit();
  }
  onTaskChange(taskOrTaskTitle: Task | string): void {
    this.isCreate.set(typeof taskOrTaskTitle === 'string');

    if (this.isCreate()) {
      // New task creation
      this.newTaskTitle.set(taskOrTaskTitle as string);
      this.selectedTask.set(null);
    } else {
      // Existing task selection
      this.selectedTask.set(taskOrTaskTitle as Task);
      this.newTaskTitle.set('');
    }
  }

  onTaskSelected(task: Task): void {
    this.isCreate.set(false);
    this.selectedTask.set(task);
    this.newTaskTitle.set('');
  }

  onTextChanged(text: string): void {
    this.isCreate.set(true);
    this.newTaskTitle.set(text);
    this.selectedTask.set(null);
  }

  onSimpleTaskInputBlur(): void {
    window.clearTimeout(this._editEndTimeout);
    this._editEndTimeout = window.setTimeout(() => this.editEnd.emit(), 200);
  }

  async onSelectTaskKeyDown(event: KeyboardEvent): Promise<void> {
    if (
      event.key === 'Enter' &&
      this.due() &&
      (this.selectedTask() || this.newTaskTitle())
    ) {
      await this.addTask();
      this.editEnd.emit();
    } else if (event.key === 'Escape') {
      this.editEnd.emit();
    } else if (event.key === '1' && event.ctrlKey) {
      this.isForDayMode.set(!this.isForDayMode());
    }
  }

  private _focusSelectTaskMinimal(): void {
    // Focus on the select-task-minimal component
    setTimeout(() => {
      const selectTaskMinimal =
        this.selectTaskMinimal()?.nativeElement?.querySelector('input');
      if (selectTaskMinimal) {
        selectTaskMinimal.focus();
      }
    }, 0);
  }

  private async addTask(): Promise<void> {
    if (this.isCreate() && this.newTaskTitle()) {
      // Create new task
      await this.createNewTask(this.newTaskTitle());
    } else if (!this.isCreate() && this.selectedTask()) {
      // Schedule existing task
      await this.scheduleExistingTask(this.selectedTask()!);
    }
  }

  private async createNewTask(title: string): Promise<void> {
    try {
      if (this.isForDayMode()) {
        // Plan task for day (no specific time)
        const id = this._taskService.add(title, false, {
          timeEstimate: 30 * 60 * 1000,
        });
        const task = await this._taskService.getByIdOnce$(id).toPromise();
        if (!task) {
          throw new Error(`Could not resolve task with id ${id}`);
        }
        this._store.dispatch(
          PlannerActions.planTaskForDay({
            task: task,
            day: getWorklogStr(this.due()),
          }),
        );
      } else {
        // Schedule task with specific time
        this._taskService.addAndSchedule(
          title,
          {
            timeEstimate: 30 * 60 * 1000,
          },
          this.due(),
          TaskReminderOptionId.AtStart,
        );
      }
    } catch (error) {
      devError(`Failed to create/schedule task: ${error}`);
    }
  }

  private async scheduleExistingTask(task: Task): Promise<void> {
    if (this.isForDayMode()) {
      // Plan existing task for day
      this._store.dispatch(
        PlannerActions.planTaskForDay({
          task: task,
          day: getWorklogStr(this.due()),
        }),
      );
    } else {
      // Schedule existing task with specific time
      this._taskService.scheduleTask(task, this.due(), TaskReminderOptionId.AtStart);
    }
  }

  private _formatTimeWithLeadingZero(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
