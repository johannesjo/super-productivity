import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  input,
  signal,
  computed,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
  DestroyRef,
  effect,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MentionModule } from 'angular-mentions';
import { MatInput } from '@angular/material/input';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MatMenuItem } from '@angular/material/menu';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { AsyncPipe, DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TaskService } from '../../task.service';
import { WorkContextService } from '../../../work-context/work-context.service';
import { ProjectService } from '../../../project/project.service';
import { TagService } from '../../../tag/tag.service';
import { GlobalConfigService } from '../../../config/global-config.service';
import { AddTaskBarService } from '../add-task-bar.service';
import { T } from '../../../../t.const';
import { TaskCopy } from '../../task.model';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, first } from 'rxjs/operators';
import { Project } from '../../../project/project.model';
import { Tag } from '../../../tag/tag.model';
import { getLocalDateStr } from '../../../../util/get-local-date-str';
import { msToString } from '../../../../ui/duration/ms-to-string.pipe';
import { stringToMs } from '../../../../ui/duration/string-to-ms.pipe';
import { IS_ANDROID_WEB_VIEW } from '../../../../util/is-android-web-view';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../../planner/store/planner.actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TaskInputStateService } from './task-input-state.service';

@Component({
  selector: 'add-task-bar-add-mode',
  templateUrl: './add-task-bar-add-mode.component.html',
  styleUrls: ['./add-task-bar-add-mode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInput,
    MatIconButton,
    MatButton,
    MatIcon,
    MatTooltip,
    MatMenu,
    MatMenuTrigger,
    MatMenuItem,
    MatChip,
    MatChipSet,
    AsyncPipe,
    DatePipe,
    TranslatePipe,
    MentionModule,
  ],
  providers: [TaskInputStateService],
})
export class AddTaskBarAddModeComponent implements AfterViewInit, OnInit {
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);
  private _projectService = inject(ProjectService);
  private _tagService = inject(TagService);
  private _globalConfigService = inject(GlobalConfigService);
  private _store = inject(Store);
  private _addTaskBarService = inject(AddTaskBarService);
  private _taskInputState = inject(TaskInputStateService);

  tabindex = input<number>(0);
  isElevated = input<boolean>(false);
  isDisableAutoFocus = input<boolean>(false);
  planForDay = input<string | undefined>(undefined);
  isAddToBottomInput = input<boolean>(false, { alias: 'isAddToBottom' });
  isAddToBacklogInput = input<boolean>(false, { alias: 'isAddToBacklog' });
  additionalFields = input<Partial<TaskCopy>>();

  // Local state for toggles
  localIsAddToBottom = signal<boolean>(false);
  localIsAddToBacklog = signal<boolean>(false);

  afterTaskAdd = output<{ taskId: string; isAddToBottom: boolean }>();
  blurred = output<void>();
  switchToSearchMode = output<void>();

  T = T;

  // Constants for menu options
  readonly DATE_OPTIONS = [
    {
      icon: 'today',
      label: 'Today',
      getDate: () => this.getTodayDate(),
    },
    {
      icon: 'event',
      label: 'Tomorrow',
      getDate: () => this.getTomorrowDate(),
    },
    {
      icon: 'date_range',
      label: 'Next Week',
      getDate: () => this.getNextWeekDate(),
    },
  ];

  readonly TIME_OPTIONS = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
  ];

  readonly ESTIMATE_OPTIONS = [
    { value: '15m', label: '15 minutes' },
    { value: '30m', label: '30 minutes' },
    { value: '1h', label: '1 hour' },
    { value: '2h', label: '2 hours' },
    { value: '4h', label: '4 hours' },
    { value: '8h', label: '8 hours' },
  ];

  inputEl = viewChild<ElementRef>('inputEl');
  titleControl = new FormControl<string>('');

  // Use computed values from the state service
  selectedProject = computed(() => this._taskInputState.currentState().project);
  selectedTags = computed(() => this._taskInputState.currentState().tags);
  selectedDate = computed(() => this._taskInputState.currentState().date);
  selectedTime = computed(() => this._taskInputState.currentState().time);
  selectedEstimate = computed(() => this._taskInputState.currentState().estimate);

  // Auto-detected state - values are auto-detected when not in UI mode and have values
  isProjectAutoDetected = computed(() => {
    const state = this._taskInputState.currentState();
    return !state.isUsingUI && !!state.project;
  });

  isTagsAutoDetected = computed(() => {
    const state = this._taskInputState.currentState();
    return !state.isUsingUI && state.tags.length > 0;
  });

  isDateAutoDetected = computed(() => {
    const state = this._taskInputState.currentState();
    return !state.isUsingUI && !!state.date;
  });

  isEstimateAutoDetected = computed(() => {
    const state = this._taskInputState.currentState();
    return !state.isUsingUI && !!state.estimate;
  });

  projects$ = this._projectService.list$.pipe(
    map((projects) => projects.filter((p) => !p.isArchived && !p.isHiddenFromMenu)),
  );

  tags$ = this._tagService.tagsNoMyDayAndNoList$;

  activeWorkContext$ = this._workContextService.activeWorkContext$;
  shortSyntaxConfig$ = this._globalConfigService.shortSyntax$;
  mentionConfig$ = this._addTaskBarService.getMentionConfig$();

  estimateDisplay = computed(() => {
    const estimate = this.selectedEstimate();
    return estimate ? msToString(estimate) : null;
  });

  dateDisplay = computed(() => {
    const date = this.selectedDate();
    if (!date) return null;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (this.isSameDate(date, today)) {
      return 'Today';
    } else if (this.isSameDate(date, tomorrow)) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString();
    }
  });

  private _destroyRef = inject(DestroyRef);

  constructor() {
    // Initialize local state from inputs and keep them in sync
    effect(
      () => {
        this.localIsAddToBottom.set(this.isAddToBottomInput());
        this.localIsAddToBacklog.set(this.isAddToBacklogInput());
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    // Set inbox project as default selection in the state service
    this._projectService.list$
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((projects) => {
        const inboxProject = projects.find((p) => p.id === 'INBOX_PROJECT');
        if (inboxProject && !this.selectedProject()) {
          this._taskInputState.updateProject(inboxProject);
        }
      });

    // Set up short syntax parsing with debounce using the new service
    combineLatest([
      this.titleControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((val) => typeof val === 'string'),
      ),
      this._globalConfigService.shortSyntax$,
      this._tagService.tagsNoMyDayAndNoList$,
      this._projectService.list$,
    ])
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(([title, config, allTags, allProjects]) => {
        if (!title) {
          return;
        }

        // Update state service with new text
        this._taskInputState.updateFromText(
          title,
          config,
          allProjects.filter((p) => !p.isArchived && !p.isHiddenFromMenu),
          allTags,
        );
      });

    // Sync text input with state service
    effect(() => {
      const currentText = this._taskInputState.currentState().rawText;
      if (currentText !== this.titleControl.value) {
        this.titleControl.setValue(currentText, { emitEvent: false });
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isDisableAutoFocus()) {
      this._focusInput();
    }

    const inputElement = (this.inputEl() as ElementRef).nativeElement;
    inputElement.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        this.blurred.emit();
      } else if (ev.key === 'Enter' && ev.ctrlKey) {
        this.addTask();
      }
    });
  }

  onProjectSelect(project: Project): void {
    this._taskInputState.updateProject(project);
  }

  onTagToggle(tag: Tag): void {
    this._taskInputState.toggleTag(tag);
  }

  onDateSelect(date: Date | null): void {
    this._taskInputState.updateDate(date);
  }

  onTimeSelect(time: string | null): void {
    this._taskInputState.updateTime(time);
  }

  onEstimateInput(value: string): void {
    const ms = stringToMs(value);
    if (ms !== null) {
      this._taskInputState.updateEstimate(ms);
    }
  }

  clearProject(): void {
    // Set back to inbox project instead of null
    this._projectService.list$.pipe(first()).subscribe((projects) => {
      const inboxProject = projects.find((p) => p.id === 'INBOX_PROJECT');
      this._taskInputState.updateProject(inboxProject || null);
    });
  }

  clearDate(): void {
    this._taskInputState.updateDate(null);
  }

  clearEstimate(): void {
    this._taskInputState.updateEstimate(null);
  }

  async addTask(): Promise<void> {
    const currentState = this._taskInputState.currentState();
    const title = currentState.cleanText || this.titleControl.value?.trim();
    if (!title) return;

    const taskData: Partial<TaskCopy> = {
      ...this.additionalFields(),
      projectId: this.selectedProject()?.id,
      tagIds: this.selectedTags().map((t) => t.id),
      timeEstimate: this.selectedEstimate() || undefined,
    };

    if (this.selectedDate()) {
      const date = this.selectedDate()!;
      if (this.selectedTime()) {
        const [hours, minutes] = this.selectedTime()!.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
        taskData.dueWithTime = date.getTime();
        taskData.hasPlannedTime = true;
      } else {
        taskData.dueWithTime = date.getTime();
        taskData.hasPlannedTime = false;
      }
    }

    const taskId = this._taskService.add(
      title,
      this.localIsAddToBacklog(),
      taskData,
      this.localIsAddToBottom(),
    );

    this.afterTaskAdd.emit({
      taskId,
      isAddToBottom: this.localIsAddToBottom(),
    });

    const planForDay = this.planForDay();
    if (planForDay && taskId) {
      this._planTaskForDay(taskId, planForDay);
    }

    this.resetForm();
  }

  private resetForm(): void {
    this.titleControl.setValue('');

    // Reset state service and set inbox project as default
    this._taskInputState.reset();
    this._projectService.list$.pipe(first()).subscribe((projects) => {
      const inboxProject = projects.find((p) => p.id === 'INBOX_PROJECT');
      if (inboxProject) {
        this._taskInputState.updateProject(inboxProject);
      }
    });

    this._focusInput();
  }

  private _planTaskForDay(taskId: string, day: string): void {
    this._taskService.getByIdOnce$(taskId).subscribe((task) => {
      if (getLocalDateStr() !== day) {
        this._store.dispatch(
          PlannerActions.planTaskForDay({
            task,
            day,
            isAddToTop: !this.localIsAddToBottom(),
          }),
        );
      }
    });
  }

  private _focusInput(): void {
    if (IS_ANDROID_WEB_VIEW) {
      document.body.focus();
      (this.inputEl() as ElementRef).nativeElement.focus();
      setTimeout(() => {
        document.body.focus();
        (this.inputEl() as ElementRef).nativeElement.focus();
      }, 1000);
    } else {
      setTimeout(() => {
        (this.inputEl() as ElementRef).nativeElement.focus();
      });
    }
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  // Helper methods for template
  hasSelectedTag(tagId: string): boolean {
    return this.selectedTags().some((t) => t.id === tagId);
  }

  private getTodayDate(): Date {
    return new Date();
  }

  private getTomorrowDate(): Date {
    return new Date(Date.now() + 86400000);
  }

  private getNextWeekDate(): Date {
    return new Date(Date.now() + 604800000);
  }

  onEstimateInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.onEstimateInput(target.value);
    }
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  toggleIsAddToBottom(): void {
    this.localIsAddToBottom.update((v) => !v);
  }

  toggleIsAddToBacklog(): void {
    this.localIsAddToBacklog.update((v) => !v);
  }
}
