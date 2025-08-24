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
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MentionConfig, MentionModule } from 'angular-mentions';
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
import { distinctUntilChanged, first, map } from 'rxjs/operators';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
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
import { AddTaskBarStateService } from './add-task-bar-state.service';
import { AddTaskBarParserService } from './add-task-bar-parser.service';
import { AddTaskBarActionsComponent } from './add-task-bar-actions/add-task-bar-actions.component';
import { Mentions } from 'angular-mentions/lib/mention-config';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { unique } from '../../../util/unique';
import { Log } from '../../../core/log';
import { CHRONO_SUGGESTIONS } from './add-task-bar.const';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [blendInOutAnimation, fadeAnimation],
  standalone: true,
  imports: [
    FormsModule,
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
    AddTaskBarActionsComponent,
    TranslateModule,
  ],
  providers: [AddTaskBarStateService, AddTaskBarParserService],
})
export class AddTaskBarComponent implements AfterViewInit, OnInit, OnDestroy {
  private readonly _taskService = inject(TaskService);
  private readonly _workContextService = inject(WorkContextService);
  private readonly _projectService = inject(ProjectService);
  private readonly _tagService = inject(TagService);
  private readonly _globalConfigService = inject(GlobalConfigService);
  private readonly _addTaskBarIssueSearchService = inject(AddTaskBarIssueSearchService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _snackService = inject(SnackService);
  private readonly _parserService = inject(AddTaskBarParserService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _translateService = inject(TranslateService);
  readonly stateService = inject(AddTaskBarStateService);

  T = T;

  // Inputs
  tabindex = input<number>(0);
  isElevated = input<boolean>(false);
  isDisableAutoFocus = input<boolean>(false);
  isNoDefaults = input<boolean>(false);
  additionalFields = input<Partial<TaskCopy>>();
  taskIdsToExclude = input<string[]>();
  isHideTagTitles = input<boolean>(false);
  tagsToRemove = input<string[]>([]);
  planForDay = input<string>();

  // Outputs
  afterTaskAdd = output<{ taskId: string; isAddToBottom: boolean }>();
  closed = output<void>();
  done = output<void>();

  // Local UI state
  isAddToBottom = signal(
    JSON.parse(localStorage.getItem(LS.IS_ADD_TO_BOTTOM) || 'false'),
  );
  isAddToBacklog = signal(false);
  isSearchMode = signal(false);
  isSearchLoading = signal(false);
  activatedSuggestion$ = new BehaviorSubject<AddTaskSuggestion | null>(null);
  isMentionMenuOpen = signal(false);

  hasNewTags = computed(() => this.stateService.state().newTagTitles.length > 0);
  nrOfRightBtns = computed(() => {
    let count = 2;
    if (this.stateService.inputTxt().length > 0) {
      count++;
    }
    if (this.stateService.state().project?.isEnableBacklog) {
      count++;
    }
    return count;
  });

  // Observables
  projects$ = this._projectService.list$.pipe(
    map((projects) => projects.filter((p) => !p.isArchived && !p.isHiddenFromMenu)),
  );
  tags$ = this._tagService.tags$;
  suggestions$!: Observable<AddTaskSuggestion[]>;
  activatedIssueTask = toSignal(this.activatedSuggestion$, { initialValue: null });

  defaultProject$ = combineLatest([
    this.projects$,
    this._workContextService.activeWorkContext$,
  ]).pipe(
    map(([projects, workContext]) => {
      const defaultProject =
        (workContext?.type === WorkContextType.PROJECT
          ? projects.find((p) => p.id === workContext.id)
          : null) || projects.find((p) => p.id === 'INBOX_PROJECT');
      return defaultProject;
    }),
  );

  defaultDateAndTime$ = this._workContextService.activeWorkContext$.pipe(
    map((workContext) => {
      if (!this.isNoDefaults()) {
        if (this.planForDay()) {
          return {
            date: this.planForDay()!,
            time: undefined as string | undefined,
          };
        } else if (
          workContext?.type === WorkContextType.TAG &&
          workContext?.id === 'TODAY'
        ) {
          return {
            date: getDbDateStr(),
            time: undefined as string | undefined,
          };
        }
      }
      return {
        date: undefined as string | undefined,
        time: undefined as string | undefined,
      };
    }),
  );

  // Create observable from signal in injection context
  private readonly _isSearchIssueProviders$ = toObservable(this.isSearchMode);

  // Tag mention functionality - will be initialized in ngOnInit
  tagMentions!: Observable<any>;
  mentionCfg$ = combineLatest([
    this._globalConfigService.shortSyntax$,
    this._tagService.tagsNoMyDayAndNoList$,
    this._projectService.list$.pipe(map((ps) => ps.filter((p) => !p.isHiddenFromMenu))),
  ]).pipe(
    map(([cfg, tagSuggestions, projectSuggestions]) => {
      const mentions: Mentions[] = [];
      if (cfg.isEnableTag) {
        mentions.push({
          items: tagSuggestions,
          labelKey: 'title',
          triggerChar: '#',
        });
      }
      if (cfg.isEnableDue) {
        mentions.push({
          items: CHRONO_SUGGESTIONS,
          labelKey: 'title',
          triggerChar: '@',
        });
      }
      // if (cfg.isEnableProject) {
      //   mentions.push({
      //     items: projectSuggestions,
      //     labelKey: 'title',
      //     triggerChar: '+',
      //   });
      // }
      const mentionCfg: MentionConfig = {
        mentions,
        triggerChar: undefined,
      };
      return mentionCfg;
    }),
  );

  // View children
  inputEl = viewChild<ElementRef>('inputEl');
  taskAutoCompleteEl = viewChild<MatAutocomplete>('taskAutoCompleteEl');
  actionsComponent = viewChild(AddTaskBarActionsComponent);

  private _focusTimeout?: number;
  private _autocompleteTimeout?: number;
  private _processingAutocompleteSelection = false;

  ngOnInit(): void {
    this._setProjectInitially();
    this._setupDefaultDate();
    this._setupTextParsing();
    this._setupSuggestions();
    this._setupTagMentions();
  }

  ngAfterViewInit(): void {
    if (!this.isDisableAutoFocus()) {
      this.focusInput(true);
    }
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._focusTimeout);
    window.clearTimeout(this._autocompleteTimeout);
  }

  // Setup methods
  private _setProjectInitially(): void {
    this.defaultProject$
      .pipe(first(), takeUntilDestroyed(this._destroyRef))
      .subscribe((defaultProject) => {
        if (defaultProject) {
          this.stateService.updateProject(defaultProject);
        }
      });
  }

  private _setupDefaultDate(): void {
    this.defaultDateAndTime$
      .pipe(first(), takeUntilDestroyed(this._destroyRef))
      .subscribe(({ date, time }) => {
        if (date) {
          this.stateService.updateDate(date, time);
        }
      });
  }

  private _setupTextParsing(): void {
    combineLatest([
      this.stateService.inputTxt$.pipe(distinctUntilChanged()),
      this._globalConfigService.shortSyntax$,
      this.tags$,
      this.projects$,
      this.defaultProject$,
      this.defaultDateAndTime$,
    ])
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(
        ([title, config, allTags, allProjects, defaultProject, defaultDateInfo]) => {
          const { date, time } = defaultDateInfo;
          this._parserService.parseAndUpdateText(
            title || '',
            config,
            allProjects,
            allTags,
            defaultProject!,
            date,
            time,
          );
        },
      );
  }

  private _setupSuggestions(): void {
    this.suggestions$ = this._addTaskBarIssueSearchService.getFilteredIssueSuggestions$(
      this.stateService.inputTxt$,
      this._isSearchIssueProviders$,
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
    this.tagMentions = this._addTaskBarIssueSearchService.getShortSyntaxTags$(
      this.stateService.inputTxt$,
    );
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
    const title = currentState.cleanText || this.stateService.inputTxt().trim();
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

    // Filter out tags to remove if specified
    const tagsToRemoveList = this.tagsToRemove();
    if (tagsToRemoveList && tagsToRemoveList.length > 0) {
      finalTagIds = finalTagIds.filter((tagId) => !tagsToRemoveList.includes(tagId));
    }

    const additionalFields = this.additionalFields();
    const taskData: Partial<TaskCopy> = {
      ...additionalFields,
      projectId: state.project?.id,
      tagIds: additionalFields?.tagIds
        ? unique([...finalTagIds, ...additionalFields.tagIds])
        : finalTagIds,
      timeEstimate: state.estimate || undefined,
    };

    if (state.date) {
      const date = new Date(state.date);
      if (state.time) {
        // TODO we need to add unit tests to confirm this works
        const [hours, minutes] = state.time.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
        taskData.dueWithTime = date.getTime();
        taskData.hasPlannedTime = true;
      } else {
        taskData.dueDay = getDbDateStr(date);
      }
    }

    Log.x(taskData);

    const taskId = this._taskService.add(
      title,
      this.isAddToBacklog(),
      taskData,
      this.isAddToBottom(),
    );

    this.afterTaskAdd.emit({ taskId, isAddToBottom: this.isAddToBottom() });
    this._resetAfterAdd();
  }

  onTaskSuggestionActivated(suggestion: AddTaskSuggestion | null): void {
    this.activatedSuggestion$.next(suggestion);
  }

  async onTaskSuggestionSelected(suggestion: AddTaskSuggestion): Promise<void> {
    if (!suggestion) return;

    this._processingAutocompleteSelection = true;

    if (this._autocompleteTimeout) {
      window.clearTimeout(this._autocompleteTimeout);
    }

    this._autocompleteTimeout = window.setTimeout(() => {
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
      taskId = await this._addTaskBarIssueSearchService.addTaskFromExistingTaskOrIssue(
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

    window.setTimeout(() => {
      this.stateService.updateInputTxt('');
      this.activatedSuggestion$.next(null);
    });
  }

  // UI event handlers
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    this.stateService.updateInputTxt(value);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const component = target.closest('add-task-bar');
    const overlayContainer = target.closest('.cdk-overlay-container');

    // If click is outside the component and not on autocomplete or menu options, close it
    if (!component && !overlayContainer) {
      this.done.emit();
    }
  }

  toggleIsAddToBottom(): void {
    this.isAddToBottom.update((v) => !v);
    localStorage.setItem(LS.IS_ADD_TO_BOTTOM, JSON.stringify(this.isAddToBottom()));
    this.focusInput();
  }

  toggleIsAddToBacklog(): void {
    this.isAddToBacklog.update((v) => !v);
    this.focusInput();
  }

  toggleSearchMode(): void {
    this.isSearchMode.update((mode) => !mode);
    this.focusInput();
  }
  onMentionClosed(): void {
    // note timeout for this to be set after keydown handler
    window.setTimeout(() => this.isMentionMenuOpen.set(false));
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // Don't submit if mention popup is open - let it handle the selection
      if (this.isMentionMenuOpen()) {
        return;
      }
      event.preventDefault();
      this.closed.emit();
    } else if (event.key === 'Enter') {
      // Don't submit if mention popup is open - let it handle the selection
      if (this.isMentionMenuOpen()) {
        return;
      }
      event.preventDefault();
      this.addTask();
    } else if (event.ctrlKey && event.key === '1') {
      event.preventDefault();
      this.toggleIsAddToBottom();
    } else if (event.ctrlKey && event.key === '2') {
      event.preventDefault();
      this.toggleSearchMode();
    } else if (event.key === '+') {
      const actionsComp = this.actionsComponent();
      if (actionsComp) {
        event.preventDefault();
        event.stopPropagation();
        actionsComp.openProjectMenu();
      }
    }
  }

  // Private helper methods
  private async _confirmNewTags(): Promise<boolean> {
    const dialogRef = this._matDialog.open(DialogConfirmComponent, {
      data: {
        message: `${this._translateService.instant(T.F.TASK.ADD_TASK_BAR.CREATE_NEW_TAGS)}: ${this.stateService.state().newTagTitles.join(', ')}?`,
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

  private _resetAfterAdd(): void {
    this.stateService.resetAfterAdd();
    // Reset parser state but don't reset project/date/estimate
    this._parserService.resetPreviousResult();
  }

  focusInput(selectAll: boolean = false): void {
    // Cancel any existing timeout
    if (this._focusTimeout !== undefined) {
      window.clearTimeout(this._focusTimeout);
    }

    document.body.focus();
    window.setTimeout(() => this.inputEl()?.nativeElement.focus());

    // Set new timeout
    if (IS_ANDROID_WEB_VIEW) {
      this._focusTimeout = window.setTimeout(() => {
        document.body.focus();
        this.inputEl()?.nativeElement.focus();
        if (selectAll) {
          this.inputEl()?.nativeElement.select();
        }
        this._focusTimeout = undefined;
      }, 200);
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
