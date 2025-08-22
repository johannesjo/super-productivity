import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MentionModule } from 'angular-mentions';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { AsyncPipe } from '@angular/common';
import { TaskService } from '../../task.service';
import { WorkContextService } from '../../../work-context/work-context.service';
import { WorkContextType } from '../../../work-context/work-context.model';
import { ProjectService } from '../../../project/project.service';
import { TagService } from '../../../tag/tag.service';
import { GlobalConfigService } from '../../../config/global-config.service';
import { AddTaskBarService } from '../add-task-bar.service';
import { T } from '../../../../t.const';
import { TaskCopy } from '../../task.model';
import { debounceTime, distinctUntilChanged, filter, first, map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
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
import { MatDialog } from '@angular/material/dialog';
import { DialogScheduleTaskComponent } from '../../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { DialogConfirmComponent } from '../../../../ui/dialog-confirm/dialog-confirm.component';

@Component({
  selector: 'add-task-bar-add-mode',
  templateUrl: './add-task-bar-add-mode.component.html',
  styleUrls: ['./add-task-bar-add-mode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
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
    AsyncPipe,
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
  private _matDialog = inject(MatDialog);

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

  // Track open menus for highlighting
  isProjectMenuOpen = signal<boolean>(false);
  isTagsMenuOpen = signal<boolean>(false);
  isEstimateMenuOpen = signal<boolean>(false);

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
  projectMenuTrigger = viewChild('projectMenuTrigger', { read: MatMenuTrigger });
  tagsMenuTrigger = viewChild('tagsMenuTrigger', { read: MatMenuTrigger });
  estimateMenuTrigger = viewChild('estimateMenuTrigger', { read: MatMenuTrigger });
  titleControl = new FormControl<string>('');

  // Use computed values from the state service
  selectedProject = computed(() => this._taskInputState.currentState().project);
  selectedTags = computed(() => this._taskInputState.currentState().tags);
  newTagTitles = computed(() => this._taskInputState.currentState().newTagTitles);
  hasNewTags = computed(() => this._taskInputState.hasNewTags());
  selectedDate = computed(() => this._taskInputState.currentState().date);
  selectedTime = computed(() => this._taskInputState.currentState().time);
  selectedEstimate = computed(() => this._taskInputState.currentState().estimate);

  // Auto-detected state using service's computed property
  isProjectAutoDetected = computed(
    () => this._taskInputState.isAutoDetected() && !!this.selectedProject(),
  );
  isTagsAutoDetected = computed(
    () => this._taskInputState.isAutoDetected() && this.selectedTags().length > 0,
  );
  isDateAutoDetected = computed(
    () => this._taskInputState.isAutoDetected() && !!this.selectedDate(),
  );
  isEstimateAutoDetected = computed(
    () => this._taskInputState.isAutoDetected() && !!this.selectedEstimate(),
  );

  projects$ = this._projectService.list$.pipe(
    map((projects) => projects.filter((p) => !p.isArchived && !p.isHiddenFromMenu)),
  );

  tags$ = this._tagService.tagsNoMyDayAndNoList$;

  activeWorkContext$ = this._workContextService.activeWorkContext$;
  mentionConfig$ = this._addTaskBarService.getMentionConfig$();

  // Tag-only mentions configuration
  tagMentions = this._tagService.tagsNoMyDayAndNoList$;
  tagMentionConfig = combineLatest([
    this._globalConfigService.shortSyntax$,
    this._tagService.tagsNoMyDayAndNoList$,
  ]).pipe(
    map(([cfg, tagSuggestions]) => {
      if (cfg.isEnableTag) {
        return {
          mentions: [{ items: tagSuggestions, labelKey: 'title', triggerChar: '#' }],
        };
      }
      return { mentions: [] };
    }),
  );

  estimateDisplay = computed(() => {
    const estimate = this.selectedEstimate();
    return estimate ? msToString(estimate) : null;
  });

  dateDisplay = computed(() => {
    const date = this.selectedDate();
    const time = this.selectedTime();
    if (!date) return null;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (this.isSameDate(date, today)) {
      return time ? time : 'Today';
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

    // Set up text sync with state service (must be in constructor for injection context)
    effect(() => {
      const currentText = this._taskInputState.currentState().rawText;
      if (currentText !== this.titleControl.value) {
        this.titleControl.setValue(currentText, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.setupDefaultProject();
    this.setupDefaultDate();
    this.setupTextParsing();
  }

  private setupDefaultProject(): void {
    // Set the initial project based on current work context
    combineLatest([
      this._projectService.list$,
      this._workContextService.activeWorkContext$,
    ])
      .pipe(first(), takeUntilDestroyed(this._destroyRef))
      .subscribe(([projects, workContext]) => {
        // Only set default if no project is currently selected
        if (!this.selectedProject()) {
          let defaultProject: Project | undefined;

          // First try to use the current work context project
          if (workContext?.type === WorkContextType.PROJECT) {
            defaultProject = projects.find((p) => p.id === workContext.id);
          }

          // Fall back to inbox if no context project found
          if (!defaultProject) {
            defaultProject = projects.find((p) => p.id === 'INBOX_PROJECT');
          }

          if (defaultProject) {
            this._taskInputState.updateProject(defaultProject);
          }
        }
      });
  }

  private setupDefaultDate(): void {
    // Set the default date to "Today" when on the Today list
    this._workContextService.activeWorkContext$
      .pipe(first(), takeUntilDestroyed(this._destroyRef))
      .subscribe((workContext) => {
        // Only set default if no date is currently selected
        if (!this.selectedDate()) {
          // Check if we're on the Today tag context
          if (workContext?.type === WorkContextType.TAG && workContext?.id === 'TODAY') {
            const today = new Date();
            this._taskInputState.updateDate(today);
          }
        }
      });
  }

  private setupTextParsing(): void {
    combineLatest([
      this.titleControl.valueChanges.pipe(
        debounceTime(50),
        distinctUntilChanged(),
        filter((val) => typeof val === 'string' && val.length > 0),
      ),
      this._globalConfigService.shortSyntax$,
      this._tagService.tagsNoMyDayAndNoList$,
      this._projectService.list$,
    ])
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(([title, config, allTags, allProjects]) => {
        this._taskInputState.updateFromText(
          title || '',
          config,
          allProjects.filter((p) => !p.isArchived && !p.isHiddenFromMenu),
          allTags,
        );
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

  openScheduleDialog(): void {
    // Prepare initial data for the dialog
    const initialData: any = {
      isSelectDueOnly: true,
    };

    // If we have a selected date, pass it as targetDay
    if (this.selectedDate()) {
      initialData.targetDay = getLocalDateStr(this.selectedDate()!);

      // If we also have a selected time, create a task object with dueWithTime
      if (this.selectedTime()) {
        const dateWithTime = new Date(this.selectedDate()!);
        const [hours, minutes] = this.selectedTime()!.split(':').map(Number);
        dateWithTime.setHours(hours, minutes, 0, 0);

        initialData.task = {
          dueWithTime: dateWithTime.getTime(),
          hasPlannedTime: true,
        };
      }
    }

    const dialogRef = this._matDialog.open(DialogScheduleTaskComponent, {
      data: initialData,
      restoreFocus: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && typeof result === 'object' && result.date) {
        this._taskInputState.updateDate(result.date, result.time);
      }
      // Always refocus input after dialog closes
      this._focusInput();
    });
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

  // Remove clearProject since we always want a project selected

  clearDate(): void {
    this._taskInputState.clearDate();
  }

  clearTags(): void {
    this._taskInputState.clearTags();
  }

  clearEstimate(): void {
    this._taskInputState.clearEstimate();
  }

  async addTask(): Promise<void> {
    const currentState = this._taskInputState.currentState();
    const title = currentState.cleanText || this.titleControl.value?.trim();
    if (!title) return;

    let finalTagIds = this.selectedTags().map((t) => t.id);

    // Handle new tags if any exist
    if (this.hasNewTags()) {
      const shouldCreateNewTags = await this._confirmNewTags();
      if (shouldCreateNewTags) {
        // Create new tags and add their IDs
        const newTagIds = await this._createNewTags(this.newTagTitles());
        finalTagIds = [...finalTagIds, ...newTagIds];
      }
      // If user declined, proceed without the new tags (finalTagIds remains as existing tags only)
    }

    const taskData: Partial<TaskCopy> = {
      ...this.additionalFields(),
      projectId: this.selectedProject()?.id,
      tagIds: finalTagIds,
      timeEstimate: this.selectedEstimate() || undefined,
    };

    if (this.selectedDate()) {
      const date = new Date(this.selectedDate()!);
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

    // Reset with current work context project as default
    combineLatest([
      this._projectService.list$,
      this._workContextService.activeWorkContext$,
    ])
      .pipe(first())
      .subscribe(([projects, workContext]) => {
        let defaultProject: Project | undefined;

        // First try to use the current work context project
        if (workContext?.type === WorkContextType.PROJECT) {
          defaultProject = projects.find((p) => p.id === workContext.id);
        }

        // Fall back to inbox if no context project found
        if (!defaultProject) {
          defaultProject = projects.find((p) => p.id === 'INBOX_PROJECT');
        }

        this._taskInputState.reset(defaultProject || null);
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

  onProjectMenuClick(event: Event): void {
    event.stopPropagation();
    const projectTrigger = this.projectMenuTrigger();
    if (projectTrigger) {
      this.isProjectMenuOpen.set(true);
      // Set up refocus when menu closes
      projectTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isProjectMenuOpen.set(false);
        this._focusInput();
      });
    }
  }

  onTagsMenuClick(event: Event): void {
    event.stopPropagation();
    const tagsTrigger = this.tagsMenuTrigger();
    if (tagsTrigger) {
      this.isTagsMenuOpen.set(true);
      // Set up refocus when menu closes
      tagsTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isTagsMenuOpen.set(false);
        this._focusInput();
      });
    }
  }

  onEstimateMenuClick(event: Event): void {
    event.stopPropagation();
    const estimateTrigger = this.estimateMenuTrigger();
    if (estimateTrigger) {
      this.isEstimateMenuOpen.set(true);
      // Set up refocus when menu closes
      estimateTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isEstimateMenuOpen.set(false);
        this._focusInput();
      });
    }
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === '+') {
      event.preventDefault();
      const projectTrigger = this.projectMenuTrigger();
      if (projectTrigger) {
        this.isProjectMenuOpen.set(true);
        projectTrigger.openMenu();
        // Refocus input when menu closes
        projectTrigger.menuClosed.pipe(first()).subscribe(() => {
          this.isProjectMenuOpen.set(false);
          this._focusInput();
        });
      }
    }
  }

  private async _confirmNewTags(): Promise<boolean> {
    const newTags = this.newTagTitles();
    const tagList = newTags.map((tag) => `<li><strong>${tag}</strong></li>`).join('');

    const dialogRef = this._matDialog.open(DialogConfirmComponent, {
      data: {
        title: 'Create New Tags',
        message: `The following tags don't exist yet. Do you want to create them?<ul>${tagList}</ul>`,
        okTxt: 'Create Tags',
        cancelTxt: 'Skip',
      },
      disableClose: false,
      autoFocus: true,
    });

    return dialogRef.afterClosed().toPromise();
  }

  private async _createNewTags(tagTitles: string[]): Promise<string[]> {
    const newTagIds: string[] = [];

    for (const title of tagTitles) {
      const newTagId = this._tagService.addTag({ title });
      newTagIds.push(newTagId);
    }

    return newTagIds;
  }
}
