import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
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
import { LS } from '../../../core/persistence/storage-keys.const';
import { blendInOutAnimation } from 'src/app/ui/animations/blend-in-out.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { TaskCopy } from '../task.model';
import { TaskService } from '../task.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { WorkContextType } from '../../work-context/work-context.model';
import { ProjectService } from '../../project/project.service';
import { TagService } from '../../tag/tag.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { AddTaskBarIssueSearchService } from './add-task-bar-issue-search.service';
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
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { stringToMs } from '../../../ui/duration/string-to-ms.pipe';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../planner/store/planner.actions';
import { BehaviorSubject, combineLatest, fromEvent, Observable, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogScheduleTaskComponent } from '../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  MatOption,
} from '@angular/material/autocomplete';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AddTaskSuggestion } from './add-task-suggestions.model';
import { IssueIconPipe } from '../../issue/issue-icon/issue-icon.pipe';
import { IssueService } from '../../issue/issue.service';
import { TagComponent } from '../../tag/tag/tag.component';
import { truncate } from '../../../util/truncate';
import { SnackService } from '../../../core/snack/snack.service';
import { TranslatePipe } from '@ngx-translate/core';
import { AddTaskBarStateService } from './add-task-bar-state.service';
import { AddTaskBarParserService } from './add-task-bar-parser.service';
import { DATE_OPTIONS, ESTIMATE_OPTIONS, TIME_OPTIONS } from './add-task-bar.const';

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
  providers: [AddTaskBarStateService, AddTaskBarParserService],
})
export class AddTaskBarComponent implements AfterViewInit, OnInit, OnDestroy {
  private readonly _taskService = inject(TaskService);
  private readonly _workContextService = inject(WorkContextService);
  private readonly _projectService = inject(ProjectService);
  private readonly _tagService = inject(TagService);
  private readonly _globalConfigService = inject(GlobalConfigService);
  private readonly _store = inject(Store);
  private readonly _addTaskBarService = inject(AddTaskBarIssueSearchService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _snackService = inject(SnackService);
  private readonly _issueService = inject(IssueService);
  private readonly _parserService = inject(AddTaskBarParserService);
  private readonly _destroyRef = inject(DestroyRef);
  readonly stateService = inject(AddTaskBarStateService);

  // Inputs
  tabindex = input<number>(0);
  isElevated = input<boolean>(false);
  isDisableAutoFocus = input<boolean>(false);
  additionalFields = input<Partial<TaskCopy>>();
  taskIdsToExclude = input<string[]>();
  isHideTagTitles = input<boolean>(false);
  isSkipAddingCurrentTag = input<boolean>(false);
  tagsToRemove = input<string[]>([]);
  isDoubleEnterMode = input<boolean>(false);
  planForDay = input<string>();

  // Outputs
  afterTaskAdd = output<{ taskId: string; isAddToBottom: boolean }>();
  blurred = output<void>();
  done = output<void>();

  // Local UI state
  isAddToBottom = signal(
    JSON.parse(localStorage.getItem(LS.IS_ADD_TO_BOTTOM) || 'false'),
  );
  isAddToBacklog = signal(false);
  isSearchMode = signal(false);
  searchControl = new FormControl<string>('');
  isSearchLoading = signal(false);
  activatedSuggestion$ = new BehaviorSubject<AddTaskSuggestion | null>(null);

  // Menu state
  isProjectMenuOpen = signal<boolean>(false);
  isTagsMenuOpen = signal<boolean>(false);
  isEstimateMenuOpen = signal<boolean>(false);

  // State from service
  state = this.stateService.state;
  hasNewTags = computed(() => this.state().newTagTitles.length > 0);
  isAutoDetected = this.stateService.isAutoDetected;

  // Observables
  projects$ = this._projectService.list$.pipe(
    map((projects) => projects.filter((p) => !p.isArchived && !p.isHiddenFromMenu)),
  );
  tags$ = this._tagService.tags$;
  suggestions$!: Observable<AddTaskSuggestion[]>;
  activatedIssueTask = toSignal(this.activatedSuggestion$, { initialValue: null });

  // Tag mention functionality - will be initialized in ngOnInit
  tagMentions!: Observable<any>;
  tagMentionConfig = this._addTaskBarService.getMentionConfig$();

  // Constants
  readonly DATE_OPTIONS = DATE_OPTIONS;
  readonly TIME_OPTIONS = TIME_OPTIONS;
  readonly ESTIMATE_OPTIONS = ESTIMATE_OPTIONS;
  T = T;

  // View children
  inputEl = viewChild<ElementRef>('inputEl');
  taskAutoEl = viewChild('taskAutoEl', { read: MatAutocomplete });
  projectMenuTrigger = viewChild('projectMenuTrigger', { read: MatMenuTrigger });
  tagsMenuTrigger = viewChild('tagsMenuTrigger', { read: MatMenuTrigger });
  estimateMenuTrigger = viewChild('estimateMenuTrigger', { read: MatMenuTrigger });

  titleControl = new FormControl<string>('');

  private _focusTimeout?: number;
  private _processingAutocompleteSelection = false;

  // Computed values
  dateDisplay = computed(() => {
    const state = this.state();
    if (!state.date) return null;
    const today = new Date();
    const date = state.date;
    if (this.isSameDate(date, today)) {
      return state.time || 'Today';
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (this.isSameDate(date, tomorrow)) {
      return state.time || 'Tomorrow';
    }
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return state.time ? `${dateStr} ${state.time}` : dateStr;
  });

  estimateDisplay = computed(() => {
    const estimate = this.state().estimate;
    return estimate ? msToString(estimate) : null;
  });

  constructor() {
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
  }

  ngOnInit(): void {
    this.setupDefaultProject();
    this.setupDefaultDate();
    this.setupTextParsing();
    this.setupSuggestions();
    this.setupTagMentions();
  }

  ngAfterViewInit(): void {
    this.restorePreviousText();

    if (!this.isDisableAutoFocus()) {
      this._focusInput(true);
    }

    // Setup escape key handling
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        filter((ev) => ev.key === 'Escape'),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((ev) => {
        if (this.isSearchMode()) {
          if (this.searchControl.value) {
            this.searchControl.setValue('');
          } else {
            this.toggleSearchMode();
          }
          ev.preventDefault();
        } else {
          if (!this.isSearchMode()) {
            this.done.emit();
          }
        }
      });
  }

  ngOnDestroy(): void {
    if (this._focusTimeout !== undefined) {
      clearTimeout(this._focusTimeout);
    }
  }

  // Setup methods
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
            this.stateService.updateProject(defaultProject);
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
          this.stateService.updateDate(new Date());
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
        this._parserService.parseAndUpdateText(title || '', config, allProjects, allTags);
      });
  }

  private setupSuggestions(): void {
    this.suggestions$ = this.titleControl.valueChanges.pipe(
      filter(() => this.isSearchMode()),
      tap(() => this.isSearchLoading.set(true)),
      debounceTime(300),
      switchMap((searchTerm) => {
        if (
          !searchTerm ||
          typeof searchTerm !== 'string' ||
          searchTerm.trim().length < 2
        ) {
          this.isSearchLoading.set(false);
          return of([]);
        }

        // Search tasks
        const taskSearch$ = this._taskService.allTasks$.pipe(
          map((tasks) => {
            const searchLower = searchTerm.toLowerCase();
            return tasks
              .filter((task) => task.title.toLowerCase().includes(searchLower))
              .slice(0, 15)
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

        // Search issues
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

        return combineLatest([taskSearch$, issueSearch$]).pipe(
          map(([tasks, issues]) => [...tasks, ...issues]),
          map((suggestions) => {
            this.isSearchLoading.set(false);
            return suggestions;
          }),
          catchError((error) => {
            console.error('Error fetching suggestions:', error);
            this.isSearchLoading.set(false);
            return of([]);
          }),
        );
      }),
    );

    // Auto-activate first suggestion when autoActiveFirstOption is true
    this.suggestions$
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((suggestions) => {
        if (suggestions && suggestions.length > 0) {
          this.onTaskSuggestionActivated(suggestions[0]);
        } else {
          this.onTaskSuggestionActivated(null);
        }
      });
  }

  private setupTagMentions(): void {
    this.tagMentions = this._addTaskBarService.getShortSyntaxTags$(this.titleControl);
  }

  // Public methods
  async addTask(): Promise<void> {
    if (this._processingAutocompleteSelection) {
      return;
    }

    const autocomplete = this.taskAutoEl();
    if (
      autocomplete &&
      autocomplete.isOpen &&
      autocomplete.options &&
      autocomplete.options.length > 0
    ) {
      return;
    }

    const currentState = this.state();
    const title = currentState.cleanText || this.titleControl.value?.trim();
    if (!title) return;

    const state = this.state();
    let finalTagIds = state.tags.map((t) => t.id);

    if (this.hasNewTags()) {
      const shouldCreateNewTags = await this._confirmNewTags();
      if (shouldCreateNewTags) {
        const newTagIds = await this._createNewTags(state.newTagTitles);
        finalTagIds = [...finalTagIds, ...newTagIds];
      }
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
        date.setHours(0, 0, 0, 0);
        taskData.dueWithTime = date.getTime();
      }
    }

    const taskId = this._taskService.add(title, this.isAddToBacklog(), taskData);

    const planForDayValue = this.planForDay();
    if (planForDayValue) {
      this._planTaskForDay(taskId, planForDayValue);
    }

    this.afterTaskAdd.emit({ taskId, isAddToBottom: this.isAddToBottom() });
    this.resetForm();
  }

  handleEnterKey(event: KeyboardEvent): void {
    event.preventDefault();
    setTimeout(() => {
      this.addTask();
    }, 50);
  }

  onTaskSuggestionActivated(suggestion: AddTaskSuggestion | null): void {
    this.activatedSuggestion$.next(suggestion);
  }

  async onTaskSuggestionSelected(suggestion: AddTaskSuggestion): Promise<void> {
    if (!suggestion) return;

    this._processingAutocompleteSelection = true;
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
      this._taskService.getByIdOnce$(suggestion.taskId).subscribe((task) => {
        this._taskService.moveToCurrentWorkContext(task);
      });

      if (suggestion.isArchivedTask) {
        this._snackService.open({
          ico: 'unarchive',
          msg: T.F.TASK.S.FOUND_RESTORE_FROM_ARCHIVE,
          translateParams: { title: suggestion.title },
        });
      } else if (suggestion.projectId) {
        this._snackService.open({
          ico: 'arrow_upward',
          msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
          translateParams: { title: suggestion.title },
        });
      }

      taskId = suggestion.taskId;
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
    }

    setTimeout(() => {
      this.titleControl.setValue('');
      this.activatedSuggestion$.next(null);
    });
  }

  // UI event handlers
  onBlur(): void {
    const text = this.titleControl.value;
    if (text && text.trim()) {
      this.saveCurrentText(text);
    }
    this.blurred.emit();
  }

  onEstimateInput(value: string): void {
    const ms = stringToMs(value);
    if (ms !== null) {
      this.stateService.updateEstimate(ms);
    }
  }

  toggleIsAddToBottom(): void {
    this.isAddToBottom.update((v) => !v);
    localStorage.setItem(LS.IS_ADD_TO_BOTTOM, JSON.stringify(this.isAddToBottom()));
  }

  toggleIsAddToBacklog(): void {
    this.isAddToBacklog.update((v) => !v);
  }

  toggleSearchMode(): void {
    this.isSearchMode.update((mode) => !mode);
    const currentValue = this.titleControl.value;
    if (currentValue && currentValue.trim().length >= 2) {
      this.titleControl.setValue(currentValue);
    }
    setTimeout(() => this._focusInput(), 0);
  }

  openScheduleDialog(): void {
    const dialogRef = this._matDialog.open(DialogScheduleTaskComponent, {
      width: '400px',
      data: {
        date: this.state().date,
        time: this.state().time,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && typeof result === 'object' && result.date) {
        this.stateService.updateDate(result.date, result.time);
      }
    });
  }

  hasSelectedTag(tagId: string): boolean {
    return this.state().tags.some((t) => t.id === tagId);
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === '1') {
      event.preventDefault();
      this.toggleIsAddToBottom();
    } else if (event.ctrlKey && event.key === '2') {
      event.preventDefault();
      this.toggleSearchMode();
    }
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === '+') {
      const projectTrigger = this.projectMenuTrigger();
      if (projectTrigger) {
        event.preventDefault();
        projectTrigger.openMenu();
      }
    }
  }

  onProjectMenuClick(event: Event): void {
    this.isProjectMenuOpen.set(true);
    const projectTrigger = this.projectMenuTrigger();
    if (projectTrigger) {
      projectTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isProjectMenuOpen.set(false);
      });
    }
  }

  onTagsMenuClick(event: Event): void {
    this.isTagsMenuOpen.set(true);
    const tagsTrigger = this.tagsMenuTrigger();
    if (tagsTrigger) {
      tagsTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isTagsMenuOpen.set(false);
      });
    }
  }

  onEstimateMenuClick(event: Event): void {
    this.isEstimateMenuOpen.set(true);
    const estimateTrigger = this.estimateMenuTrigger();
    if (estimateTrigger) {
      estimateTrigger.menuClosed.pipe(first()).subscribe(() => {
        this.isEstimateMenuOpen.set(false);
      });
    }
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  // Private helper methods
  private async _confirmNewTags(): Promise<boolean> {
    const dialogRef = this._matDialog.open(DialogConfirmComponent, {
      data: {
        message: `Create new tags: ${this.state().newTagTitles.join(', ')}?`,
      },
    });
    return await dialogRef.afterClosed().toPromise();
  }

  private async _createNewTags(tagTitles: string[]): Promise<string[]> {
    const newTagIds: string[] = [];
    for (const title of tagTitles) {
      const tagId = this._tagService.addTag({ title });
      newTagIds.push(tagId);
    }
    return newTagIds;
  }

  private saveCurrentText(text: string): void {
    if (text.trim()) {
      sessionStorage.setItem('SUP_PREVIOUS_TASK_TEXT', text);
    }
  }

  private restorePreviousText(): void {
    const savedText = sessionStorage.getItem('SUP_PREVIOUS_TASK_TEXT');
    if (savedText && savedText.trim()) {
      this.titleControl.setValue(savedText, { emitEvent: true });
      sessionStorage.removeItem('SUP_PREVIOUS_TASK_TEXT');

      combineLatest([this._globalConfigService.shortSyntax$, this.tags$, this.projects$])
        .pipe(first())
        .subscribe(([config, allTags, allProjects]) => {
          this._parserService.parseAndUpdateText(savedText, config, allProjects, allTags);
        });
    }
  }

  private clearSavedText(): void {
    sessionStorage.removeItem('SUP_PREVIOUS_TASK_TEXT');
  }

  private resetForm(): void {
    this.titleControl.setValue('');
    this.clearSavedText();

    combineLatest([this.projects$, this._workContextService.activeWorkContext$])
      .pipe(first())
      .subscribe(([projects, workContext]) => {
        let defaultProject: Project | null = null;

        if (workContext?.type === WorkContextType.PROJECT) {
          defaultProject = projects.find((p) => p.id === workContext.id) || null;
        }

        if (!defaultProject) {
          defaultProject = projects.find((p) => p.id === 'INBOX_PROJECT') || null;
        }

        this.stateService.resetState(defaultProject);
      });
  }

  private _planTaskForDay(taskId: string, day: string): void {
    this._store.dispatch(
      PlannerActions.planTaskForDay({
        task: { id: taskId } as TaskCopy,
        day,
      }),
    );
  }

  private _focusInput(selectAll: boolean = false): void {
    // Cancel any existing timeout
    if (this._focusTimeout !== undefined) {
      clearTimeout(this._focusTimeout);
    }

    // Set new timeout
    if (IS_ANDROID_WEB_VIEW) {
      this._focusTimeout = window.setTimeout(() => {
        const inputElement = this.inputEl()?.nativeElement;
        if (inputElement) {
          inputElement.focus();
          if (selectAll) {
            inputElement.select();
          }
        }
      }, 1000);
    } else {
      this._focusTimeout = window.setTimeout(() => {
        const inputElement = this.inputEl()?.nativeElement;
        if (inputElement) {
          inputElement.focus();
          if (selectAll) {
            inputElement.select();
          }
        }
      }, 50);
    }
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
}
