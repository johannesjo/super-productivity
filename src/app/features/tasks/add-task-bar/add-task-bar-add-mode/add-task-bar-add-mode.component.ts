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
import { shortSyntax } from '../../short-syntax';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { Project } from '../../../project/project.model';
import { Tag } from '../../../tag/tag.model';
import { getLocalDateStr } from '../../../../util/get-local-date-str';
import { msToString } from '../../../../ui/duration/ms-to-string.pipe';
import { stringToMs } from '../../../../ui/duration/string-to-ms.pipe';
import { IS_ANDROID_WEB_VIEW } from '../../../../util/is-android-web-view';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../../planner/store/planner.actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
})
export class AddTaskBarAddModeComponent implements AfterViewInit, OnInit {
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);
  private _projectService = inject(ProjectService);
  private _tagService = inject(TagService);
  private _globalConfigService = inject(GlobalConfigService);
  private _store = inject(Store);
  private _addTaskBarService = inject(AddTaskBarService);

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

  selectedProject = signal<Project | null>(null);
  selectedTags = signal<Tag[]>([]);
  selectedDate = signal<Date | null>(null);
  selectedTime = signal<string | null>(null);
  selectedEstimate = signal<number | null>(null);

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

  parsedTitle = signal<string>('');
  // Track if values were auto-detected from input vs manually selected
  isProjectAutoDetected = signal<boolean>(false);
  isTagsAutoDetected = signal<boolean>(false);
  isDateAutoDetected = signal<boolean>(false);
  isEstimateAutoDetected = signal<boolean>(false);

  constructor() {
    // Initialize local state from inputs
    effect(
      () => {
        this.localIsAddToBottom.set(this.isAddToBottomInput());
        this.localIsAddToBacklog.set(this.isAddToBacklogInput());
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    // Set up short syntax parsing with debounce
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
          this.clearAutoDetected();
          return;
        }

        const result = shortSyntax(
          { title, tagIds: [], projectId: undefined },
          config,
          allTags,
          allProjects.filter((p) => !p.isArchived && !p.isHiddenFromMenu),
        );

        if (!result) {
          this.clearAutoDetected();
          return;
        }

        // Update parsed title
        if (result.taskChanges.title) {
          this.parsedTitle.set(result.taskChanges.title);
        } else {
          this.parsedTitle.set(title);
        }

        // Auto-select detected project
        if (result.projectId && !this.selectedProject()) {
          const project = allProjects.find((p) => p.id === result.projectId);
          if (project) {
            this.selectedProject.set(project);
            this.isProjectAutoDetected.set(true);
          }
        } else if (!result.projectId && this.isProjectAutoDetected()) {
          this.selectedProject.set(null);
          this.isProjectAutoDetected.set(false);
        }

        // Auto-select detected tags
        if (result.taskChanges.tagIds && result.taskChanges.tagIds.length > 0) {
          const tags = result.taskChanges.tagIds
            .map((id) => allTags.find((t) => t.id === id))
            .filter(Boolean) as Tag[];
          if (tags.length > 0 && this.selectedTags().length === 0) {
            this.selectedTags.set(tags);
            this.isTagsAutoDetected.set(true);
          }
        } else if (
          (!result.taskChanges.tagIds || result.taskChanges.tagIds.length === 0) &&
          this.isTagsAutoDetected()
        ) {
          this.selectedTags.set([]);
          this.isTagsAutoDetected.set(false);
        }

        // Auto-select detected date and time
        if (result.taskChanges.dueWithTime && !this.selectedDate()) {
          const date = new Date(result.taskChanges.dueWithTime);
          this.selectedDate.set(date);
          this.isDateAutoDetected.set(true);
          if (result.taskChanges.hasPlannedTime !== false) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            this.selectedTime.set(`${hours}:${minutes}`);
          }
        } else if (!result.taskChanges.dueWithTime && this.isDateAutoDetected()) {
          this.selectedDate.set(null);
          this.selectedTime.set(null);
          this.isDateAutoDetected.set(false);
        }

        // Auto-select detected estimate
        if (result.taskChanges.timeEstimate && !this.selectedEstimate()) {
          this.selectedEstimate.set(result.taskChanges.timeEstimate);
          this.isEstimateAutoDetected.set(true);
        } else if (!result.taskChanges.timeEstimate && this.isEstimateAutoDetected()) {
          this.selectedEstimate.set(null);
          this.isEstimateAutoDetected.set(false);
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
    this.selectedProject.set(project);
    this.isProjectAutoDetected.set(false);
  }

  onTagToggle(tag: Tag): void {
    const currentTags = this.selectedTags();
    const existingIndex = currentTags.findIndex((t) => t.id === tag.id);

    if (existingIndex >= 0) {
      this.selectedTags.set(currentTags.filter((t) => t.id !== tag.id));
    } else {
      this.selectedTags.set([...currentTags, tag]);
    }
    this.isTagsAutoDetected.set(false);
  }

  onDateSelect(date: Date | null): void {
    this.selectedDate.set(date);
    this.isDateAutoDetected.set(false);
  }

  onTimeSelect(time: string | null): void {
    this.selectedTime.set(time);
  }

  onEstimateInput(value: string): void {
    const ms = stringToMs(value);
    if (ms !== null) {
      this.selectedEstimate.set(ms);
      this.isEstimateAutoDetected.set(false);
    }
  }

  clearProject(): void {
    this.selectedProject.set(null);
    this.isProjectAutoDetected.set(false);
  }

  clearDate(): void {
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.isDateAutoDetected.set(false);
  }

  clearEstimate(): void {
    this.selectedEstimate.set(null);
    this.isEstimateAutoDetected.set(false);
  }

  async addTask(): Promise<void> {
    const title = this.parsedTitle() || this.titleControl.value?.trim();
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
    this.selectedProject.set(null);
    this.selectedTags.set([]);
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.selectedEstimate.set(null);
    this.clearAutoDetected();
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

  private clearAutoDetected(): void {
    this.parsedTitle.set('');
    // Only clear if they were auto-detected
    if (this.isProjectAutoDetected()) {
      this.selectedProject.set(null);
      this.isProjectAutoDetected.set(false);
    }
    if (this.isTagsAutoDetected()) {
      this.selectedTags.set([]);
      this.isTagsAutoDetected.set(false);
    }
    if (this.isDateAutoDetected()) {
      this.selectedDate.set(null);
      this.selectedTime.set(null);
      this.isDateAutoDetected.set(false);
    }
    if (this.isEstimateAutoDetected()) {
      this.selectedEstimate.set(null);
      this.isEstimateAutoDetected.set(false);
    }
  }

  toggleIsAddToBottom(): void {
    this.localIsAddToBottom.update((v) => !v);
  }

  toggleIsAddToBacklog(): void {
    this.localIsAddToBacklog.update((v) => !v);
  }
}
