import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MentionModule } from 'angular-mentions';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { AsyncPipe } from '@angular/common';
import { LS, SS } from '../../../core/persistence/storage-keys.const';
import { blendInOutAnimation } from 'src/app/ui/animations/blend-in-out.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { TaskCopy } from '../task.model';
import { TaskService } from '../task.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { WorkContextType } from '../../work-context/work-context.model';
import { ProjectService } from '../../project/project.service';
import { TagService } from '../../tag/tag.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { AddTaskBarService } from './add-task-bar.service';
import { T } from '../../../t.const';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  first,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { getLocalDateStr } from '../../../util/get-local-date-str';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { stringToMs } from '../../../ui/duration/string-to-ms.pipe';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { Store } from '@ngrx/store';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogScheduleTaskComponent } from '../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  MatOption,
} from '@angular/material/autocomplete';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { IssueService } from '../../issue/issue.service';
import { AddTaskSuggestion } from './add-task-suggestions.model';
import { IssueIconPipe } from '../../issue/issue-icon/issue-icon.pipe';
import { TagComponent } from '../../tag/tag/tag.component';
import { truncate } from '../../../util/truncate';
import { SnackService } from '../../../core/snack/snack.service';
import { shortSyntax } from '../short-syntax';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [blendInOutAnimation, fadeAnimation],
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
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    MatProgressSpinner,
    IssueIconPipe,
    TagComponent,
    TranslatePipe,
  ],
  providers: [],
})
export class AddTaskBarComponent implements AfterViewInit, OnInit, OnDestroy {
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);
  private _projectService = inject(ProjectService);
  private _tagService = inject(TagService);
  private _globalConfigService = inject(GlobalConfigService);
  private _store = inject(Store);
  private _addTaskBarService = inject(AddTaskBarService);
  private _matDialog = inject(MatDialog);
  private _issueService = inject(IssueService);
  private _snackService = inject(SnackService);

  tabindex = input<number>(0);
  isElevated = input<boolean>(false);
  isDisableAutoFocus = input<boolean>(false);
  additionalFields = input<Partial<TaskCopy>>();
  taskIdsToExclude = input<string[]>();
  isHideTagTitles = input<boolean>(false);
  isSkipAddingCurrentTag = input<boolean>(false);
  tagsToRemove = input<string[]>([]);
  isDoubleEnterMode = input<boolean>(false);

  afterTaskAdd = output<{ taskId: string; isAddToBottom: boolean }>();
  blurred = output<void>();
  done = output<void>();

  isAddToBottom = signal(
    JSON.parse(localStorage.getItem(LS.IS_ADD_TO_BOTTOM) || 'false'),
  );
  isAddToBacklog = signal(false);

  // Search mode state
  isSearchMode = signal(false);
  searchControl = new FormControl<string>('');
  isSearchLoading = signal(false);
  activatedSuggestion$ = new BehaviorSubject<AddTaskSuggestion | null>(null);
  private _processingAutocompleteSelection = false;

  // Track open menus for highlighting
  isProjectMenuOpen = signal<boolean>(false);
  isTagsMenuOpen = signal<boolean>(false);
  isEstimateMenuOpen = signal<boolean>(false);

  // Convert activated suggestion observable to signal for template
  activatedIssueTask = toSignal(this.activatedSuggestion$, { initialValue: null });

  // Search suggestions - initialized in constructor
  suggestions$!: Observable<AddTaskSuggestion[]>;

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
  taskAutoEl = viewChild('taskAutoEl', { read: MatAutocomplete });
  projectMenuTrigger = viewChild('projectMenuTrigger', { read: MatMenuTrigger });
  tagsMenuTrigger = viewChild('tagsMenuTrigger', { read: MatMenuTrigger });
  estimateMenuTrigger = viewChild('estimateMenuTrigger', { read: MatMenuTrigger });
  titleControl = new FormControl<string>('');

  // Internal state management
  private _taskInputState = signal({
    project: null as Project | null,
    tags: [] as Tag[],
    newTagTitles: [] as string[],
    date: null as Date | null,
    time: null as string | null,
    estimate: null as number | null,
    rawText: '',
    cleanText: '',
  });

  state = this._taskInputState.asReadonly();
  hasNewTags = computed(() => this.state().newTagTitles.length > 0);
  isAutoDetected = signal(false);

  projects$ = this._projectService.list$.pipe(
    map((projects) => projects.filter((p) => !p.isArchived && !p.isHiddenFromMenu)),
  );
  tags$ = this._tagService.tagsNoMyDayAndNoList$;
  tagMentions = this.tags$;
  tagMentionConfig = combineLatest([
    this._globalConfigService.shortSyntax$,
    this.tags$,
  ]).pipe(
    map(([cfg, tagSuggestions]) => ({
      mentions: cfg.isEnableTag
        ? [{ items: tagSuggestions, labelKey: 'title', triggerChar: '#' }]
        : [],
    })),
  );

  estimateDisplay = computed(() => {
    const estimate = this.state().estimate;
    return estimate ? msToString(estimate) : null;
  });

  dateDisplay = computed(() => {
    const date = this.state().date;
    const time = this.state().time;
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
  private _focusTimeout?: number;

  constructor() {
    // Set up bidirectional text sync with state service
    effect(() => {
      const currentText = this.state().rawText;
      if (currentText !== this.titleControl.value) {
        this.titleControl.setValue(currentText, { emitEvent: false });
      }
    });

    // Save text on every keystroke
    this.titleControl.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((value) => {
        if (value !== null) {
          this.saveCurrentText(value);
        }
      });

    // Clean up focus timeout on destroy
    this._destroyRef.onDestroy(() => {
      if (this._focusTimeout !== undefined) {
        clearTimeout(this._focusTimeout);
        this._focusTimeout = undefined;
      }
    });

    // Initialize search suggestions observable
    this.suggestions$ = this.titleControl.valueChanges.pipe(
      filter(() => this.isSearchMode()),
      tap(() => this.isSearchLoading.set(true)),
      debounceTime(300),
      switchMap((searchTerm) => {
        // Always clear loading state if no search term
        if (
          !searchTerm ||
          typeof searchTerm !== 'string' ||
          searchTerm.trim().length < 2
        ) {
          this.isSearchLoading.set(false);
          return of([]);
        }

        // Only search tasks when in search mode
        const taskSearch$ = this._taskService.allTasks$.pipe(
          map((tasks) => {
            const searchLower = searchTerm.toLowerCase();
            return tasks
              .filter((task) => task.title.toLowerCase().includes(searchLower))
              .slice(0, 15) // More results in search mode
              .map(
                (task) =>
                  ({
                    title: task.title,
                    taskId: task.id,
                    projectId: task.projectId,
                    isArchivedTask: task.isDone,
                  }) as AddTaskSuggestion,
              );
          }),
          catchError(() => of([] as AddTaskSuggestion[])),
        );

        // Only search issues when in search mode
        const issueSearch$ = this._issueService
          .searchAllEnabledIssueProviders$(searchTerm)
          .pipe(
            map((issueSuggestions) =>
              issueSuggestions.slice(0, 15).map(
                (issueSuggestion) =>
                  ({
                    title: issueSuggestion.title,
                    titleHighlighted: issueSuggestion.titleHighlighted,
                    issueData: issueSuggestion.issueData,
                    issueType: issueSuggestion.issueType,
                    issueProviderId: issueSuggestion.issueProviderId,
                  }) as AddTaskSuggestion,
              ),
            ),
            catchError(() => of([] as AddTaskSuggestion[])),
          );

        // Combine both searches
        return combineLatest([taskSearch$, issueSearch$]).pipe(
          map(([tasks, issues]) => [...tasks, ...issues]),
          tap(() => this.isSearchLoading.set(false)),
        );
      }),
      map((suggestions) => {
        const taskIdsToExclude = this.taskIdsToExclude() || [];
        return suggestions.filter((s) => {
          if (s.taskId) {
            return !taskIdsToExclude.includes(s.taskId);
          }
          return true;
        });
      }),
    );
  }

  ngOnInit(): void {
    this.setupDefaultProject();
    this.setupDefaultDate();
    this.setupTextParsing();
  }

  private setupDefaultProject(): void {
    combineLatest([this.projects$, this._workContextService.activeWorkContext$])
      .pipe(first(), takeUntilDestroyed(this._destroyRef))
      .subscribe(([projects, workContext]) => {
        if (!this.state().project) {
          const defaultProject =
            (workContext?.type === WorkContextType.PROJECT
              ? projects.find((p) => p.id === workContext.id)
              : null) || projects.find((p) => p.id === 'INBOX_PROJECT');

          if (defaultProject) {
            this.updateProject(defaultProject);
          }
        }
      });
  }

  private setupDefaultDate(): void {
    this._workContextService.activeWorkContext$
      .pipe(first(), takeUntilDestroyed(this._destroyRef))
      .subscribe((workContext) => {
        if (
          !this.state().date &&
          workContext?.type === WorkContextType.TAG &&
          workContext?.id === 'TODAY'
        ) {
          this.updateDate(new Date());
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
      this.tags$,
      this.projects$,
    ])
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(([title, config, allTags, allProjects]) => {
        this.updateFromText(title || '', config, allProjects, allTags);
      });
  }

  ngAfterViewInit(): void {
    // Restore text first, before any focus operations
    this.restorePreviousText();

    if (!this.isDisableAutoFocus()) {
      // Select all text if there's existing content (from previous session)
      const hasExistingText = !!this.titleControl.value;
      this._focusInput(hasExistingText);
    }

    const inputElement = (this.inputEl() as ElementRef).nativeElement;
    inputElement.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (this.isSearchMode()) {
          if (this.searchControl.value) {
            this.searchControl.setValue('');
          } else {
            this.toggleSearchMode();
          }
        } else {
          this.blurred.emit();
        }
      } else if (ev.key === 'Enter' && ev.ctrlKey) {
        if (!this.isSearchMode()) {
          this.addTask();
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this._focusTimeout !== undefined) {
      clearTimeout(this._focusTimeout);
      this._focusTimeout = undefined;
    }
  }

  onBlur(): void {
    const text = this.titleControl.value;
    if (text && text.trim()) {
      sessionStorage.setItem(SS.TODO_TMP, text);
    } else {
      sessionStorage.removeItem(SS.TODO_TMP);
    }
  }

  onProjectSelect(project: Project): void {
    this.updateProject(project);
  }

  onTagToggle(tag: Tag): void {
    this.toggleTag(tag);
  }

  onDateSelect(date: Date | null): void {
    this.updateDate(date);
  }

  openScheduleDialog(): void {
    // Prepare initial data for the dialog
    const initialData: any = {
      isSelectDueOnly: true,
    };

    // If we have a selected date, pass it as targetDay
    const state = this.state();
    if (state.date) {
      initialData.targetDay = getLocalDateStr(state.date);

      // If we also have a selected time, create a task object with dueWithTime
      if (state.time) {
        const dateWithTime = new Date(state.date);
        const [hours, minutes] = state.time.split(':').map(Number);
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
        this.updateDate(result.date, result.time);
      }
      // Always refocus input after dialog closes
      this._focusInput();
    });
  }

  onTimeSelect(time: string | null): void {
    this.updateTime(time);
  }

  onEstimateInput(value: string): void {
    const ms = stringToMs(value);
    if (ms !== null) {
      this.updateEstimate(ms);
    }
  }

  clearDate(): void {
    this.updateDate(null);
  }

  clearTags(): void {
    this._taskInputState.update((state) => ({ ...state, tags: [], newTagTitles: [] }));
  }

  clearEstimate(): void {
    this.updateEstimate(null);
  }

  async addTask(): Promise<void> {
    // Don't create a new task if we're processing an autocomplete selection
    if (this._processingAutocompleteSelection) {
      return;
    }

    // Also check if autocomplete is currently open with options
    const autocomplete = this.taskAutoEl();
    if (
      autocomplete &&
      autocomplete.isOpen &&
      autocomplete.options &&
      autocomplete.options.length > 0
    ) {
      // Don't create a new task when autocomplete has options
      return;
    }

    const currentState = this.state();
    const title = currentState.cleanText || this.titleControl.value?.trim();
    if (!title) return;

    const state = this.state();
    let finalTagIds = state.tags.map((t) => t.id);

    // Handle new tags if any exist
    if (this.hasNewTags()) {
      const shouldCreateNewTags = await this._confirmNewTags();
      if (shouldCreateNewTags) {
        // Create new tags and add their IDs
        const newTagIds = await this._createNewTags(state.newTagTitles);
        finalTagIds = [...finalTagIds, ...newTagIds];
      }
      // If user declined, proceed without the new tags (finalTagIds remains as existing tags only)
    }

    const taskData: Partial<TaskCopy> = {
      ...this.additionalFields(),
      projectId: state.project?.id,
      tagIds: finalTagIds,
      timeEstimate: state.estimate || undefined,
    };

    if (state.date) {
      const date = new Date(state.date);
      if (state.time) {
        const [hours, minutes] = state.time.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
        taskData.dueWithTime = date.getTime();
        taskData.hasPlannedTime = true;
      } else {
        taskData.dueDay = getLocalDateStr(state.date);
        taskData.hasPlannedTime = false;
      }
    }

    const taskId = this._taskService.add(
      title,
      this.isAddToBacklog(),
      taskData,
      this.isAddToBottom(),
    );

    this.afterTaskAdd.emit({
      taskId,
      isAddToBottom: this.isAddToBottom(),
    });

    this.resetForm();
  }

  private resetForm(): void {
    // Clear saved text when task is successfully added
    this.clearSavedText();
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

        this.resetState(defaultProject || null);
      });

    this._focusInput();
  }

  private _focusInput(selectAll: boolean = false): void {
    // Clear any existing timeout
    if (this._focusTimeout !== undefined) {
      clearTimeout(this._focusTimeout);
      this._focusTimeout = undefined;
    }

    if (IS_ANDROID_WEB_VIEW) {
      document.body.focus();
      (this.inputEl() as ElementRef).nativeElement.focus();
      this._focusTimeout = window.setTimeout(() => {
        document.body.focus();
        (this.inputEl() as ElementRef).nativeElement.focus();
        if (selectAll) {
          (this.inputEl() as ElementRef).nativeElement.select();
        }
        this._focusTimeout = undefined;
      }, 1000);
    } else {
      this._focusTimeout = window.setTimeout(() => {
        const inputElement = (this.inputEl() as ElementRef).nativeElement;
        inputElement.focus();
        if (selectAll) {
          inputElement.select();
        }
        this._focusTimeout = undefined;
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
    return this.state().tags.some((t) => t.id === tagId);
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
    this.isAddToBottom.set(!this.isAddToBottom());
    localStorage.setItem(LS.IS_ADD_TO_BOTTOM, JSON.stringify(this.isAddToBottom()));
  }

  toggleIsAddToBacklog(): void {
    this.isAddToBacklog.set(!this.isAddToBacklog());
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
    const newTags = this.state().newTagTitles;
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

  private saveCurrentText(text: string): void {
    if (text.trim()) {
      sessionStorage.setItem(SS.TODO_TMP, text);
    } else {
      sessionStorage.removeItem(SS.TODO_TMP);
    }
  }

  private restorePreviousText(): void {
    const savedText = sessionStorage.getItem(SS.TODO_TMP);
    if (savedText && savedText.trim()) {
      // Set the form control value
      this.titleControl.setValue(savedText, { emitEvent: true });

      // Update the state service to keep them in sync
      // We need to wait for the required observables to be ready
      combineLatest([this._globalConfigService.shortSyntax$, this.tags$, this.projects$])
        .pipe(first())
        .subscribe(([config, allTags, allProjects]) => {
          this.updateFromText(savedText, config, allProjects, allTags);
        });
    }
  }

  private clearSavedText(): void {
    sessionStorage.removeItem(SS.TODO_TMP);
  }

  toggleSearchMode(): void {
    this.isSearchMode.update((mode) => !mode);
    // Trigger suggestions refresh by emitting current value
    const currentValue = this.titleControl.value;
    if (currentValue && currentValue.trim().length >= 2) {
      this.titleControl.setValue(currentValue + ' ');
      this.titleControl.setValue(currentValue);
    }
    // Focus input to refresh autocomplete with new search mode
    setTimeout(() => this._focusInput(), 0);
  }

  handleEnterKey(event: KeyboardEvent): void {
    event.preventDefault();

    // Delay addTask to allow optionSelected to fire first if autocomplete is selecting
    setTimeout(() => {
      this.addTask();
    }, 50);
  }

  onTaskSuggestionActivated(suggestion: AddTaskSuggestion | null): void {
    this.activatedSuggestion$.next(suggestion);
  }

  async onTaskSuggestionSelected(suggestion: AddTaskSuggestion): Promise<void> {
    if (!suggestion) return;

    // Set flag to indicate we're processing an autocomplete selection
    this._processingAutocompleteSelection = true;

    // Clear the flag after a short delay
    setTimeout(() => {
      this._processingAutocompleteSelection = false;
    }, 100);

    let taskId: string | undefined;

    if (suggestion.taskId && suggestion.isFromOtherContextAndTagOnlySearch) {
      if (this._workContextService.activeWorkContextType === WorkContextType.TAG) {
        const task = await this._taskService.getByIdOnce$(suggestion.taskId).toPromise();
        this._taskService.moveToCurrentWorkContext(task);
      }
      this._snackService.open({
        ico: 'playlist_add',
        msg: T.F.TASK.S.FOUND_MOVE_FROM_OTHER_LIST,
        translateParams: {
          title: truncate(suggestion.title),
          contextTitle: suggestion.ctx?.title
            ? truncate(suggestion.ctx.title)
            : '~the void~',
        },
      });
      taskId = suggestion.taskId;
    } else if (suggestion.taskId) {
      if (suggestion.projectId) {
        this._taskService.getByIdOnce$(suggestion.taskId).subscribe((task) => {
          this._taskService.moveToCurrentWorkContext(task);
        });
        this._snackService.open({
          ico: 'arrow_upward',
          msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
          translateParams: { title: suggestion.title },
        });
        taskId = suggestion.taskId;
      }
    } else if (suggestion.issueType && suggestion.issueData) {
      taskId = await this._addTaskBarService.addTaskFromExistingTaskOrIssue(
        suggestion,
        this.isAddToBacklog(),
        true,
      );
    }

    if (taskId) {
      this.afterTaskAdd.emit({
        taskId,
        isAddToBottom: false,
      });
      this.titleControl.setValue('');
      // Clear the activated suggestion
      this.activatedSuggestion$.next(null);
      // Don't automatically turn off search mode, let user decide
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Ctrl+1 to toggle add to top/bottom
    if (event.ctrlKey && event.key === '1') {
      event.preventDefault();
      this.toggleIsAddToBottom();
    }
    // Ctrl+2 to toggle search mode
    else if (event.ctrlKey && event.key === '2') {
      event.preventDefault();
      this.toggleSearchMode();
    }
  }

  // Internal state management methods
  private updateProject(project: Project | null): void {
    this._taskInputState.update((state) => ({ ...state, project }));
    // Clear auto-detected flag when manually changing project
    this.isAutoDetected.set(false);
  }

  private updateDate(date: Date | null, time?: string | null): void {
    this._taskInputState.update((state) => ({
      ...state,
      date,
      time: time !== undefined ? time : state.time,
    }));
  }

  private updateTime(time: string | null): void {
    this._taskInputState.update((state) => ({ ...state, time }));
  }

  private updateEstimate(estimate: number | null): void {
    this._taskInputState.update((state) => ({ ...state, estimate }));
  }

  private toggleTag(tag: Tag): void {
    this._taskInputState.update((state) => {
      const existingIndex = state.tags.findIndex((t) => t.id === tag.id);
      if (existingIndex >= 0) {
        // Remove tag
        const newTags = [...state.tags];
        newTags.splice(existingIndex, 1);
        return { ...state, tags: newTags };
      } else {
        // Add tag
        return { ...state, tags: [...state.tags, tag] };
      }
    });
  }

  private resetState(defaultProject: Project | null): void {
    this._taskInputState.set({
      project: defaultProject,
      tags: [],
      newTagTitles: [],
      date: null,
      time: null,
      estimate: null,
      rawText: '',
      cleanText: '',
    });
    // Reset auto-detected flag
    this.isAutoDetected.set(false);
  }

  private updateFromText(
    text: string,
    config: any,
    allProjects: Project[],
    allTags: Tag[],
  ): void {
    // Start with basic state
    const newState = {
      rawText: text,
      cleanText: text,
      project: this.state().project,
      tags: this.state().tags,
      newTagTitles: [] as string[],
      date: this.state().date,
      time: this.state().time,
      estimate: this.state().estimate,
    };

    // Only parse if we have text and config
    if (text && config) {
      try {
        const parseResult = shortSyntax(
          { title: text, tagIds: newState.tags.map((t) => t.id) },
          config,
          allTags,
          allProjects,
        );

        if (parseResult) {
          // Update clean text
          if (parseResult.taskChanges.title) {
            newState.cleanText = parseResult.taskChanges.title;
          }

          // Update project if found
          if (parseResult.projectId) {
            const foundProject = allProjects.find((p) => p.id === parseResult.projectId);
            if (foundProject) {
              newState.project = foundProject;
              this.isAutoDetected.set(true);
            }
          }

          // Update tags if found
          if (parseResult.taskChanges.tagIds) {
            const foundTags = allTags.filter((tag) =>
              parseResult.taskChanges.tagIds?.includes(tag.id),
            );
            newState.tags = [
              ...newState.tags,
              ...foundTags.filter(
                (tag) => !newState.tags.some((existing) => existing.id === tag.id),
              ),
            ];
          }

          // Update new tag titles
          if (parseResult.newTagTitles.length > 0) {
            newState.newTagTitles = parseResult.newTagTitles;
          }

          // Update time estimate
          if (parseResult.taskChanges.timeEstimate) {
            newState.estimate = parseResult.taskChanges.timeEstimate;
          }

          // Update due date
          if (parseResult.taskChanges.dueWithTime) {
            const dueDate = new Date(parseResult.taskChanges.dueWithTime);
            newState.date = dueDate;

            // Extract time if it has planned time
            if (parseResult.taskChanges.hasPlannedTime !== false) {
              const hours = dueDate.getHours().toString().padStart(2, '0');
              const minutes = dueDate.getMinutes().toString().padStart(2, '0');
              newState.time = `${hours}:${minutes}`;
            }
          }
        }
      } catch (error) {
        console.warn('Short syntax parsing failed:', error);
        // Fall back to basic text update
      }
    }

    this._taskInputState.update(() => newState);
  }
}
