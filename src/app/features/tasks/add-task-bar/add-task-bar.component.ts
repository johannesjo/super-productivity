import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MentionModule } from 'angular-mentions';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
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
import { debounceTime, distinctUntilChanged, filter, first, map } from 'rxjs/operators';
import { Project } from '../../project/project.model';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../planner/store/planner.actions';
import { BehaviorSubject, combineLatest, fromEvent, Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  MatOption,
} from '@angular/material/autocomplete';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AddTaskSuggestion } from './add-task-suggestions.model';
import { IssueIconPipe } from '../../issue/issue-icon/issue-icon.pipe';
import { TagComponent } from '../../tag/tag/tag.component';
import { truncate } from '../../../util/truncate';
import { SnackService } from '../../../core/snack/snack.service';
import { TranslatePipe } from '@ngx-translate/core';
import { AddTaskBarStateService } from './add-task-bar-state.service';
import { AddTaskBarParserService } from './add-task-bar-parser.service';
import { AddTaskBarActionsComponent } from './add-task-bar-actions/add-task-bar-actions.component';

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
    MatIcon,
    MatTooltip,
    AsyncPipe,
    MentionModule,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    MatProgressSpinner,
    IssueIconPipe,
    TagComponent,
    TranslatePipe,
    AddTaskBarActionsComponent,
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
  private readonly _parserService = inject(AddTaskBarParserService);
  private readonly _destroyRef = inject(DestroyRef);
  readonly stateService = inject(AddTaskBarStateService);

  T = T;

  // Inputs
  tabindex = input<number>(0);
  isElevated = input<boolean>(false);
  isDisableAutoFocus = input<boolean>(false);
  additionalFields = input<Partial<TaskCopy>>();
  taskIdsToExclude = input<string[]>();
  isHideTagTitles = input<boolean>(false);
  isSkipAddingCurrentTag = input<boolean>(false);
  tagsToRemove = input<string[]>([]);
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

  hasNewTags = computed(() => this.stateService.state().newTagTitles.length > 0);

  // Observables
  projects$ = this._projectService.list$.pipe(
    map((projects) => projects.filter((p) => !p.isArchived && !p.isHiddenFromMenu)),
  );
  tags$ = this._tagService.tags$;
  suggestions$!: Observable<AddTaskSuggestion[]>;
  activatedIssueTask = toSignal(this.activatedSuggestion$, { initialValue: null });

  // Create observable from signal in injection context
  private readonly isSearchIssueProviders$ = toObservable(this.isSearchMode);

  // Tag mention functionality - will be initialized in ngOnInit
  tagMentions!: Observable<any>;
  tagMentionConfig = this._addTaskBarService.getMentionConfig$();

  // View children
  inputEl = viewChild<ElementRef>('inputEl');
  taskAutoCompleteEl = viewChild<MatAutocomplete>('taskAutoCompleteEl');
  actionsComponent = viewChild(AddTaskBarActionsComponent);

  titleControl = new FormControl<string>('');

  private _focusTimeout?: number;
  private _processingAutocompleteSelection = false;

  constructor() {
    // Save text on every keystroke
    this.titleControl.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((value) => {
        if (value !== null) {
          this._saveCurrentText(value);
        }
      });
  }

  ngOnInit(): void {
    this._setupDefaultProject();
    this._setupDefaultDate();
    this._setupTextParsing();
    this._setupSuggestions();
    this._setupTagMentions();
  }

  ngAfterViewInit(): void {
    this._restorePreviousText();

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
    window.clearTimeout(this._focusTimeout);
  }

  // Setup methods
  private _setupDefaultProject(): void {
    combineLatest([this.projects$, this._workContextService.activeWorkContext$])
      .pipe(first(), takeUntilDestroyed(this._destroyRef))
      .subscribe(([projects, workContext]) => {
        const defaultProject =
          (workContext?.type === WorkContextType.PROJECT
            ? projects.find((p) => p.id === workContext.id)
            : null) || projects.find((p) => p.id === 'INBOX_PROJECT');
        if (defaultProject) {
          this.stateService.updateProject(defaultProject);
        }
      });
  }

  private _setupDefaultDate(): void {
    this._workContextService.activeWorkContext$
      .pipe(first(), takeUntilDestroyed(this._destroyRef))
      .subscribe((workContext) => {
        if (
          !this.stateService.state().date &&
          workContext?.type === WorkContextType.TAG &&
          workContext?.id === 'TODAY'
        ) {
          this.stateService.updateDate(new Date());
        }
      });
  }

  private _setupTextParsing(): void {
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

  private _setupSuggestions(): void {
    this.suggestions$ = this._addTaskBarService.getFilteredIssueSuggestions$(
      this.titleControl,
      this.isSearchIssueProviders$,
      this.isSearchLoading,
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

  private _setupTagMentions(): void {
    this.tagMentions = this._addTaskBarService.getShortSyntaxTags$(this.titleControl);
  }

  // Public methods
  async addTask(): Promise<void> {
    if (this._processingAutocompleteSelection) {
      return;
    }

    const autocomplete = this.taskAutoCompleteEl();
    if (
      autocomplete &&
      autocomplete.isOpen &&
      autocomplete.options &&
      autocomplete.options.length > 0
    ) {
      return;
    }

    const currentState = this.stateService.state();
    const title = currentState.cleanText || this.titleControl.value?.trim();
    if (!title) return;

    const state = this.stateService.state();
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
    this._resetForm();
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
      this._saveCurrentText(text);
    }
    this.blurred.emit();
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

  onInputKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === '1') {
      event.preventDefault();
      this.toggleIsAddToBottom();
    } else if (event.ctrlKey && event.key === '2') {
      event.preventDefault();
      this.toggleSearchMode();
    } else if (event.key === '+') {
      const actionsComp = this.actionsComponent();
      if (actionsComp) {
        event.preventDefault();
        actionsComp.openProjectMenu();
      }
    }
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  // Private helper methods
  private async _confirmNewTags(): Promise<boolean> {
    const dialogRef = this._matDialog.open(DialogConfirmComponent, {
      data: {
        message: `Create new tags: ${this.stateService.state().newTagTitles.join(', ')}?`,
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

  private _saveCurrentText(text: string): void {
    if (text.trim()) {
      sessionStorage.setItem('SUP_PREVIOUS_TASK_TEXT', text);
    }
  }

  private _restorePreviousText(): void {
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

  private _resetForm(): void {
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
}
