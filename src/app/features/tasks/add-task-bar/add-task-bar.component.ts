import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { TaskService } from '../task.service';
import {
  debounceTime,
  filter,
  first,
  map,
  startWith,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { JiraIssue } from '../../issue/providers/jira/jira-issue/jira-issue.model';
import {
  BehaviorSubject,
  combineLatest,
  forkJoin,
  from,
  Observable,
  of,
  Subscription,
  zip,
} from 'rxjs';
import { IssueService } from '../../issue/issue.service';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from '../../../t.const';
import { Task } from '../task.model';
import { AddTaskSuggestion } from './add-task-suggestions.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { WorkContextType } from '../../work-context/work-context.model';
import { SearchResultItem } from '../../issue/issue.model';
import { truncate } from '../../../util/truncate';
import { TagService } from '../../tag/tag.service';
import { ProjectService } from '../../project/project.service';
import { Popover } from '../../../ui/popover';
import { Tag } from '../../tag/tag.model';
import { Project } from '../../project/project.model';
import { ShortSyntaxTag, shortSyntaxToTags } from './short-syntax-to-tags';
import { slideAnimation } from '../../../ui/animations/slide.ani';
import { SimpleSchedulePickerComponent } from '../../planner/simple-schedule-picker/simple-schedule-picker.component';
import { blendInOutAnimation } from 'src/app/ui/animations/blend-in-out.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { SS } from '../../../core/persistence/storage-keys.const';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../planner/store/planner.actions';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { GlobalConfigService } from '../../config/global-config.service';
import { ShortSyntaxConfig } from '../../config/global-config.model';
import { DEFAULT_GLOBAL_CONFIG } from '../../config/default-global-config.const';
import { MentionConfig, Mentions } from 'angular-mentions/lib/mention-config';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [blendInOutAnimation, slideAnimation, fadeAnimation],
})
export class AddTaskBarComponent implements AfterViewInit, OnDestroy {
  @Input() isAddToBacklog: boolean = false;
  @Input() tabindex: number = 0;
  @Input() isAddToBottom: boolean = false;
  @Input() isDoubleEnterMode: boolean = false;
  @Input() isElevated: boolean = false;
  @Input() isHideTagTitles: boolean = false;
  @Input() isDisableAutoFocus: boolean = false;
  @Input() planForDay?: string;
  @Output() blurred: EventEmitter<any> = new EventEmitter();
  @Output() done: EventEmitter<any> = new EventEmitter();

  @ViewChild('inputEl', { static: true }) inputEl!: ElementRef;

  T: typeof T = T;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  popover = inject(Popover);
  doubleEnterCount: number = 0;
  ignoreBlur: boolean = false;
  scheduledDate: Date | null = null;

  taskSuggestionsCtrl: UntypedFormControl = new UntypedFormControl();

  filteredIssueSuggestions$: Observable<AddTaskSuggestion[]> =
    this.taskSuggestionsCtrl.valueChanges.pipe(
      debounceTime(300),
      tap(() => this.isLoading$.next(true)),
      withLatestFrom(this._workContextService.activeWorkContextTypeAndId$),
      switchMap(([searchTerm, { activeType, activeId }]) =>
        activeType === WorkContextType.PROJECT
          ? this._searchForProject$(searchTerm, activeId)
          : this._searchForTag$(searchTerm, activeId),
      ) as any,
      // don't show issues twice
      // NOTE: this only works because backlog items come first
      map((items: AddTaskSuggestion[]) =>
        items.reduce((unique: AddTaskSuggestion[], item: AddTaskSuggestion) => {
          return item.issueData &&
            unique.find(
              // NOTE: we check defined because we don't want to run into
              // false == false or similar
              (u) =>
                !!u.taskIssueId &&
                !!item.issueData &&
                u.taskIssueId === item.issueData.id,
            )
            ? unique
            : [...unique, item];
        }, []),
      ),
      tap(() => {
        this.isLoading$.next(false);
      }),
    );

  activatedIssueTask$: BehaviorSubject<AddTaskSuggestion | null> =
    new BehaviorSubject<AddTaskSuggestion | null>(null);
  activatedIssueTask: AddTaskSuggestion | null = null;

  shortSyntaxTags: ShortSyntaxTag[] = [];
  shortSyntaxTags$: Observable<ShortSyntaxTag[]> =
    this.taskSuggestionsCtrl.valueChanges.pipe(
      filter((val) => typeof val === 'string'),
      withLatestFrom(
        this._tagService.tags$,
        this._projectService.list$,
        this._workContextService.activeWorkContext$,
      ),
      map(([val, tags, projects, activeWorkContext]) =>
        shortSyntaxToTags({
          val,
          tags,
          projects,
          defaultColor: activeWorkContext.theme.primary,
          shortSyntaxConfig: this._shortSyntaxConfig,
        }),
      ),
      startWith([]),
    );

  inputVal: string = '';
  inputVal$: Observable<string> = this.taskSuggestionsCtrl.valueChanges;

  tagSuggestions$: Observable<Tag[]> = this._tagService.tagsNoMyDayAndNoList$;

  projectSuggestions$: Observable<Project[]> = this._projectService.list$.pipe(
    map((ps) => ps.filter((p) => !p.isHiddenFromMenu)),
  );

  isAddToBacklogAvailable$: Observable<boolean> =
    this._workContextService.activeWorkContext$.pipe(map((ctx) => !!ctx.isEnableBacklog));

  // isAddToBacklogAvailable$: Observable<boolean> = this.shortSyntaxTags$.pipe(
  //   switchMap((shortSyntaxTags) => {
  //     const shortSyntaxProjectId =
  //       shortSyntaxTags.length &&
  //       shortSyntaxTags.find((tag: ShortSyntaxTag) => tag.projectId)?.projectId;
  //
  //     if (typeof shortSyntaxProjectId === 'string') {
  //       return this._projectService
  //         .getByIdOnce$(shortSyntaxProjectId)
  //         .pipe(map((project) => project.isEnableBacklog));
  //     }
  //
  //     return this._workContextService.activeWorkContext$.pipe(
  //       map((ctx) => !!ctx.isEnableBacklog),
  //     );
  //   }),
  // );

  mentionConfig$: Observable<MentionConfig> = combineLatest([
    this._globalConfigService.shortSyntax$,
    this.tagSuggestions$,
    this.projectSuggestions$,
  ]).pipe(
    map(([cfg, tagSuggestions, projectSuggestions]) => {
      const mentions: Mentions[] = [];
      if (cfg.isEnableTag) {
        mentions.push({ items: tagSuggestions, labelKey: 'title', triggerChar: '#' });
      }
      if (cfg.isEnableProject) {
        mentions.push({ items: projectSuggestions, labelKey: 'title', triggerChar: '+' });
      }
      return {
        mentions,
      };
    }),
  );

  private _isAddInProgress?: boolean;
  private _delayBlurTimeout?: number;
  private _autofocusTimeout?: number;
  private _attachKeyDownHandlerTimeout?: number;
  private _saveTmpTodoTimeout?: number;
  private _lastAddedTaskId?: string;
  private _subs: Subscription = new Subscription();
  private _shortSyntaxConfig: ShortSyntaxConfig = DEFAULT_GLOBAL_CONFIG.shortSyntax;

  constructor(
    private _taskService: TaskService,
    private _workContextService: WorkContextService,
    private _issueService: IssueService,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _tagService: TagService,
    private _cd: ChangeDetectorRef,
    private _store: Store,
    private _globalConfigService: GlobalConfigService,
  ) {
    this._subs.add(
      this.activatedIssueTask$.subscribe((v) => (this.activatedIssueTask = v)),
    );
    this._subs.add(this.shortSyntaxTags$.subscribe((v) => (this.shortSyntaxTags = v)));
    this._subs.add(this.inputVal$.subscribe((v) => (this.inputVal = v)));

    this._subs.add(
      this._globalConfigService.shortSyntax$.subscribe(
        (shortSyntaxConfig) => (this._shortSyntaxConfig = shortSyntaxConfig),
      ),
    );
  }

  ngAfterViewInit(): void {
    this.isAddToBottom = !!this.planForDay || this.isAddToBottom;
    if (!this.isDisableAutoFocus) {
      this._focusInput();
    }

    this._attachKeyDownHandlerTimeout = window.setTimeout(() => {
      (this.inputEl as ElementRef).nativeElement.addEventListener(
        'keydown',
        (ev: KeyboardEvent) => {
          if (ev.key === 'Escape') {
            this.blurred.emit();
            // needs to be set otherwise the activatedIssueTask won't reflect the task that is added
            this.activatedIssueTask$.next(null);
          } else if (ev.key === '@') {
            this.ignoreBlur = true;
            // Need to pass origin element to calculate the position to insert the popover
            this.popover.open(SimpleSchedulePickerComponent, {
              origin: this.inputEl,
            });
          } else if (ev.key === '1' && ev.ctrlKey) {
            this.isAddToBottom = !this.isAddToBottom;
            this._cd.detectChanges();
            ev.preventDefault();
          } else if (ev.key === '2' && ev.ctrlKey) {
            this.isAddToBacklog = !this.isAddToBacklog;
            this._cd.detectChanges();
            ev.preventDefault();
          }
        },
      );
    });

    const savedTodo = sessionStorage.getItem(SS.TODO_TMP) || '';
    if (savedTodo) {
      sessionStorage.setItem(SS.TODO_TMP, '');
      this.taskSuggestionsCtrl.setValue(savedTodo);
      this._saveTmpTodoTimeout = window.setTimeout(() => {
        (this.inputEl as ElementRef).nativeElement.value = savedTodo;
        (this.inputEl as ElementRef).nativeElement.select();
      });
    }
  }

  ngOnDestroy(): void {
    if (this._delayBlurTimeout) {
      window.clearTimeout(this._delayBlurTimeout);
    }
    if (this._attachKeyDownHandlerTimeout) {
      window.clearTimeout(this._attachKeyDownHandlerTimeout);
    }
    if (this._autofocusTimeout) {
      window.clearTimeout(this._autofocusTimeout);
    }
    if (this._saveTmpTodoTimeout) {
      window.clearTimeout(this._saveTmpTodoTimeout);
    }

    if (this._lastAddedTaskId) {
      this._taskService.focusTaskIfPossible(this._lastAddedTaskId);
    }
    this._subs.unsubscribe();
  }

  onOptionActivated(val: any): void {
    this.activatedIssueTask$.next(val);
  }

  onBlur(ev: FocusEvent): void {
    if (this.ignoreBlur) {
      this.ignoreBlur = false;
      return;
    }
    const relatedTarget: HTMLElement = ev.relatedTarget as HTMLElement;
    let isUIelement = false;

    // NOTE: related target is null for all elements that are not focusable (e.g. items without tabindex, non-buttons, non-inputs etc.)
    if (relatedTarget) {
      const { className } = relatedTarget;
      isUIelement =
        className.includes('switch-add-to-btn') ||
        className.includes('switch-add-to-bot-btn') ||
        className.includes('shepherd-enabled');
    }

    if (!relatedTarget || (relatedTarget && !isUIelement)) {
      sessionStorage.setItem(
        SS.TODO_TMP,
        (this.inputEl as ElementRef).nativeElement.value,
      );
    }

    if (relatedTarget && isUIelement) {
      (this.inputEl as ElementRef).nativeElement.focus();
    } else {
      // we need to wait since otherwise addTask is not working
      this._delayBlurTimeout = window.setTimeout(() => {
        if (this._isAddInProgress) {
          this._delayBlurTimeout = window.setTimeout(() => {
            this.blurred.emit(ev);
          }, 300);
        } else {
          this.blurred.emit(ev);
        }
      }, 220);
    }
  }

  displayWith(issue?: JiraIssue): string | undefined {
    // NOTE: apparently issue can be undefined for displayWith
    return issue?.summary;
  }

  async addTask(): Promise<void> {
    this._isAddInProgress = true;
    const item: AddTaskSuggestion | string = this.taskSuggestionsCtrl.value;

    if (!item) {
      return;
    } else if (typeof item === 'string') {
      const newTaskStr = item as string;
      if (newTaskStr.length > 0) {
        this.doubleEnterCount = 0;
        this._lastAddedTaskId = this._taskService.add(
          newTaskStr,
          this.isAddToBacklog,
          {},
          this.isAddToBottom,
        );
      } else if (this.doubleEnterCount > 0) {
        this.blurred.emit();
        this.done.emit();
      } else if (this.isDoubleEnterMode) {
        this.doubleEnterCount++;
      }
    } else if (item.taskId && item.isFromOtherContextAndTagOnlySearch) {
      this._lastAddedTaskId = item.taskId;
      const task = await this._taskService.getByIdOnce$(item.taskId).toPromise();
      this._taskService.updateTags(task, [
        ...task.tagIds,
        this._workContextService.activeWorkContextId as string,
      ]);

      this._snackService.open({
        ico: 'playlist_add',
        msg: T.F.TASK.S.FOUND_MOVE_FROM_OTHER_LIST,
        translateParams: {
          title: truncate(item.title),
          contextTitle:
            item.ctx && item.ctx.title ? truncate(item.ctx.title) : '~the void~',
        },
      });
      // NOTE: it's important that this comes before the issue check
      // so that backlog issues are found first
    } else if (item.taskId) {
      if (!item.projectId) {
        console.log(item);
        throw new Error('Weird add task case1');
      }
      this._lastAddedTaskId = item.taskId;
      this._projectService.moveTaskToTodayList(item.taskId, item.projectId);
      this._snackService.open({
        ico: 'arrow_upward',
        msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
        translateParams: { title: item.title },
      });
    } else {
      if (!item.issueType || !item.issueData) {
        throw new Error('No issueData');
      }
      const res = await this._taskService.checkForTaskWithIssueInProject(
        item.issueData.id,
        item.issueType,
        this._workContextService.activeWorkContextId as string,
      );
      if (!res) {
        this._lastAddedTaskId = await this._issueService.addTaskWithIssue(
          item.issueType,
          item.issueData.id,
          this._workContextService.activeWorkContextId as string,
          this.isAddToBacklog,
        );
      } else if (res.isFromArchive) {
        this._lastAddedTaskId = res.task.id;
        this._taskService.restoreTask(res.task, res.subTasks || []);
        this._snackService.open({
          ico: 'info',
          msg: T.F.TASK.S.FOUND_RESTORE_FROM_ARCHIVE,
          translateParams: { title: res.task.title },
        });
      } else if (res.task.projectId) {
        this._lastAddedTaskId = res.task.id;
        this._projectService.moveTaskToTodayList(res.task.id, res.task.projectId);
        this._snackService.open({
          ico: 'arrow_upward',
          msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
          translateParams: { title: res.task.title },
        });
      } else {
        throw new Error('Weird add task case2');
      }
    }

    if (this._lastAddedTaskId) {
      this._planForDayAfterAddTaskIfConfigured(this._lastAddedTaskId);
    }

    if (this.planForDay) {
      this.blurred.emit();
    } else {
      this._focusInput();
    }

    this.taskSuggestionsCtrl.setValue('');
    this._isAddInProgress = false;
    sessionStorage.setItem(SS.TODO_TMP, '');
  }

  private _planForDayAfterAddTaskIfConfigured(taskId: string): void {
    const planForDay = this.planForDay;
    if (planForDay) {
      this._taskService.getByIdOnce$(taskId).subscribe((task) => {
        if (getWorklogStr() !== planForDay) {
          this._store.dispatch(
            PlannerActions.planTaskForDay({
              task: task,
              day: planForDay,
              isAddToTop: !this.isAddToBottom,
            }),
          );
        }
      });
    }
  }

  private async _getCtxForTaskSuggestion({
    projectId,
    tagIds,
  }: AddTaskSuggestion): Promise<Tag | Project> {
    if (projectId) {
      return await this._projectService.getByIdOnce$(projectId).toPromise();
    } else {
      const firstTagId = (tagIds as string[])[0];
      if (!firstTagId) {
        throw new Error('No first tag');
      }
      return await this._tagService.getTagById$(firstTagId).pipe(first()).toPromise();
    }
  }

  private _focusInput(): void {
    // for android we need to make sure that a focus event is called to open the keyboard
    if (IS_ANDROID_WEB_VIEW) {
      document.body.focus();
      (this.inputEl as ElementRef).nativeElement.focus();
      this._autofocusTimeout = window.setTimeout(() => {
        document.body.focus();
        (this.inputEl as ElementRef).nativeElement.focus();
      }, 1000);
    } else {
      // for non mobile we don't need this, since it's much faster
      this._autofocusTimeout = window.setTimeout(() => {
        (this.inputEl as ElementRef).nativeElement.focus();
      });
    }
  }

  private _filterBacklog(searchText: string, task: Task): boolean {
    try {
      return !!task.title.toLowerCase().match(searchText.toLowerCase());
    } catch (e) {
      console.warn('RegEx Error', e);
      return false;
    }
  }

  // TODO improve typing
  private _searchForProject$(
    searchTerm: string,
    projectId: string,
  ): Observable<(AddTaskSuggestion | SearchResultItem)[]> {
    if (searchTerm && searchTerm.length > 0) {
      const backlog$ = this._workContextService.backlogTasks$.pipe(
        map((tasks) =>
          tasks
            .filter((task) => this._filterBacklog(searchTerm, task))
            .map(
              (task): AddTaskSuggestion => ({
                title: task.title,
                taskId: task.id,
                projectId,
                taskIssueId: task.issueId || undefined,
                issueType: task.issueType || undefined,
              }),
            ),
        ),
      );
      const issues$ = this._issueService.searchIssues$(
        searchTerm,
        this._workContextService.activeWorkContextId as string,
      );
      return zip(backlog$, issues$).pipe(
        map(([backlog, issues]) => [...backlog, ...issues]),
      );
    } else {
      return of([]);
    }
  }

  private _searchForTag$(
    searchTerm: string,
    currentTagId: string,
  ): Observable<(AddTaskSuggestion | SearchResultItem)[]> {
    if (searchTerm && searchTerm.length > 0) {
      return this._taskService.getAllParentWithoutTag$(currentTagId).pipe(
        take(1),
        map((tasks) =>
          tasks
            .filter((task) => this._filterBacklog(searchTerm, task))
            .map((task): AddTaskSuggestion => {
              return {
                title: task.title,
                taskId: task.id,
                taskIssueId: task.issueId || undefined,
                issueType: task.issueType || undefined,
                projectId: task.projectId || undefined,

                isFromOtherContextAndTagOnlySearch: true,
                tagIds: task.tagIds,
              };
            }),
        ),
        switchMap((tasks) =>
          !!tasks.length
            ? forkJoin(
                tasks.map((task) => {
                  const isFromProject = !!task.projectId;
                  return from(this._getCtxForTaskSuggestion(task)).pipe(
                    first(),
                    map((ctx) => ({
                      ...task,
                      ctx: {
                        ...ctx,
                        icon: (ctx && (ctx as Tag).icon) || (isFromProject && 'list'),
                      },
                    })),
                  );
                }),
              )
            : of([]),
        ),
        // TODO revisit typing here
      ) as any;
    } else {
      return of([]);
    }
  }
}
