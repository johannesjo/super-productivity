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
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { TaskService } from '../task.service';
import { debounceTime, filter, first, map, startWith, switchMap, take, tap, withLatestFrom } from 'rxjs/operators';
import { JiraIssue } from '../../issue/providers/jira/jira-issue/jira-issue.model';
import { BehaviorSubject, forkJoin, from, Observable, of, Subscription, zip } from 'rxjs';
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
import { Tag } from '../../tag/tag.model';
import { Project } from '../../project/project.model';
import { shortSyntaxToTags } from './short-syntax-to-tags.util';
import { slideAnimation } from '../../../ui/animations/slide.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideAnimation, fadeAnimation]
})
export class AddTaskBarComponent implements AfterViewInit, OnDestroy {
  @Input() isAddToBacklog: boolean = false;
  @Input() isAddToBottom: boolean = false;
  @Input() isDoubleEnterMode: boolean = false;
  @Input() isElevated: boolean = false;
  @Input() isDisableAutoFocus: boolean = false;
  @Output() blurred: EventEmitter<any> = new EventEmitter();
  @Output() done: EventEmitter<any> = new EventEmitter();

  @ViewChild('inputEl', {static: true}) inputEl?: ElementRef;

  T: typeof T = T;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  doubleEnterCount: number = 0;

  taskSuggestionsCtrl: FormControl = new FormControl();

  filteredIssueSuggestions$: Observable<AddTaskSuggestion[]> = this.taskSuggestionsCtrl.valueChanges.pipe(
    debounceTime(300),
    tap(() => this.isLoading$.next(true)),
    withLatestFrom(this._workContextService.activeWorkContextTypeAndId$),
    switchMap(([searchTerm, {activeType, activeId}]) => (activeType === WorkContextType.PROJECT)
      ? this._searchForProject$(searchTerm)
      : this._searchForTag$(searchTerm, activeId)
    ) as any,
    // don't show issues twice
    // NOTE: this only works because backlog items come first
    map((items: AddTaskSuggestion[]) => items.reduce(
      (unique: AddTaskSuggestion[], item: AddTaskSuggestion) => {
        return (item.issueData && unique.find(
          // NOTE: we check defined because we don't want to run into
          // false == false or similar
          u => !!u.taskIssueId && !!item.issueData && u.taskIssueId === item.issueData.id
        ))
          ? unique
          : [...unique, item];
      }, [])
    ),
    tap(() => {
      this.isLoading$.next(false);
    }),
  );

  activatedIssueTask$: BehaviorSubject<AddTaskSuggestion | null> = new BehaviorSubject<AddTaskSuggestion | null>(null);
  activatedIssueTask: AddTaskSuggestion | null = null;

  shortSyntaxTags: {
    title: string;
    color: string;
    icon: string;
  }[] = [];
  shortSyntaxTags$: Observable<{
    title: string;
    color: string;
    icon: string;
  }[]> = this.taskSuggestionsCtrl.valueChanges.pipe(
    filter(val => typeof val === 'string'),
    withLatestFrom(this._tagService.tags$, this._projectService.list$, this._workContextService.activeWorkContext$),
    map(([val, tags, projects, activeWorkContext]) => shortSyntaxToTags({
      val,
      tags,
      projects,
      defaultColor: activeWorkContext.theme.primary
    })),
    startWith([]),
  );

  inputVal: string = '';
  inputVal$: Observable<string> = this.taskSuggestionsCtrl.valueChanges;

  private _isAddInProgress?: boolean;
  private _blurTimeout?: number;
  private _autofocusTimeout?: number;
  private _attachKeyDownHandlerTimeout?: number;
  private _lastAddedTaskId?: string;
  private _subs: Subscription = new Subscription();

  constructor(
    private _taskService: TaskService,
    private _workContextService: WorkContextService,
    private _issueService: IssueService,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _tagService: TagService,
    private _cd: ChangeDetectorRef,
  ) {
    this._subs.add(this.activatedIssueTask$.subscribe((v) => this.activatedIssueTask = v));
    this._subs.add(this.shortSyntaxTags$.subscribe((v) => this.shortSyntaxTags = v));
    this._subs.add(this.inputVal$.subscribe((v) => this.inputVal = v));
  }

  ngAfterViewInit(): void {
    this._autofocusTimeout = setTimeout(() => {
      if (!this.isDisableAutoFocus) {
        (this.inputEl as ElementRef).nativeElement.focus();
      }
    });

    this._attachKeyDownHandlerTimeout = setTimeout(() => {
      (this.inputEl as ElementRef).nativeElement.addEventListener('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          this.blurred.emit();
        } else if (ev.key === '1' && ev.ctrlKey) {
          this.isAddToBacklog = !this.isAddToBacklog;
          this._cd.detectChanges();
          ev.preventDefault();
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this._blurTimeout) {
      window.clearTimeout(this._blurTimeout);
    }
    if (this._attachKeyDownHandlerTimeout) {
      window.clearTimeout(this._attachKeyDownHandlerTimeout);
    }
    if (this._autofocusTimeout) {
      window.clearTimeout(this._autofocusTimeout);
    }

    if (this._lastAddedTaskId) {
      this._taskService.focusTaskIfPossible(this._lastAddedTaskId);
    }
  }

  closeBtnClose(ev: Event) {
    this.blurred.emit(ev);
  }

  onOptionActivated(val: any) {
    this.activatedIssueTask$.next(val);
  }

  onBlur(ev: FocusEvent) {
    const relatedTarget: HTMLElement = ev.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.className.includes('switch-add-to-btn')) {
      (this.inputEl as ElementRef).nativeElement.focus();
    } else if (relatedTarget && relatedTarget.className.includes('mat-option')) {
      this._blurTimeout = window.setTimeout(() => {
        if (!this._isAddInProgress) {
          this.blurred.emit(ev);
        }
      }, 300);
    } else {
      this.blurred.emit(ev);
    }
  }

  displayWith(issue: JiraIssue) {
    return issue && issue.summary;
  }

  trackByFn(i: number, item: AddTaskSuggestion) {
    return item.taskId || (item.issueData && item.issueData.id);
  }

  trackById(i: number, item: any): string {
    return item.id;
  }

  async addTask() {
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
          this.isAddToBottom
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
      this._taskService.updateTags(task, [...task.tagIds, this._workContextService.activeWorkContextId as string], task.tagIds);

      this._snackService.open({
        ico: 'playlist_add',
        msg: T.F.TASK.S.FOUND_MOVE_FROM_OTHER_LIST,
        translateParams: {
          title: truncate(item.title),
          contextTitle: (item.ctx && item.ctx.title)
            ? truncate(item.ctx.title)
            : '~the void~'
        },
      });
      // NOTE: it's important that this comes before the issue check
      // so that backlog issues are found first
    } else if (item.taskId) {
      this._lastAddedTaskId = item.taskId;
      this._taskService.moveToToday(item.taskId);
      this._snackService.open({
        ico: 'arrow_upward',
        msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
        translateParams: {title: item.title},
      });
    } else {
      if (!item.issueType || !item.issueData) {
        throw new Error('No issueData');
      }
      const res = await this._taskService.checkForTaskWithIssueInProject(item.issueData.id, item.issueType, this._workContextService.activeWorkContextId as string);
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
          translateParams: {title: res.task.title},
        });
      } else {
        this._lastAddedTaskId = res.task.id;
        this._taskService.moveToToday(res.task.id);
        this._snackService.open({
          ico: 'arrow_upward',
          msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
          translateParams: {title: res.task.title},
        });
      }
    }

    this.taskSuggestionsCtrl.setValue('');
    this._isAddInProgress = false;
  }

  private async _getCtxForTaskSuggestion({projectId, tagIds}: AddTaskSuggestion): Promise<Tag | Project> {
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

  private _filterBacklog(searchText: string, task: Task) {
    try {
      return task.title.toLowerCase().match(searchText.toLowerCase());
    } catch (e) {
      console.warn('RegEx Error', e);
      return false;
    }
  }

  // TODO improve typing
  private _searchForProject$(searchTerm: string): Observable<(AddTaskSuggestion | SearchResultItem)[]> {
    if (searchTerm && searchTerm.length > 0) {
      const backlog$ = this._workContextService.backlogTasks$.pipe(
        map(tasks => tasks
          .filter(task => this._filterBacklog(searchTerm, task))
          .map((task): AddTaskSuggestion => ({
            title: task.title,
            taskId: task.id,
            taskIssueId: task.issueId || undefined,
            issueType: task.issueType || undefined,
          }))
        )
      );
      const issues$ = this._issueService.searchIssues$(searchTerm, this._workContextService.activeWorkContextId as string);
      return zip(backlog$, issues$).pipe(
        map(([backlog, issues]) => ([...backlog, ...issues])),
      );
    } else {
      return of([]);
    }
  }

  private _searchForTag$(searchTerm: string, currentTagId: string): Observable<(AddTaskSuggestion | SearchResultItem)[]> {
    if (searchTerm && searchTerm.length > 0) {
      return this._taskService.getAllParentWithoutTag$(currentTagId).pipe(
        take(1),
        map(tasks => tasks
          .filter(task => this._filterBacklog(searchTerm, task))
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
          })
        ),
        switchMap(tasks => !!(tasks.length)
          ? forkJoin(tasks.map(task => {
            const isFromProject = !!task.projectId;
            return from(this._getCtxForTaskSuggestion(task)).pipe(
              first(),
              map(ctx => ({
                ...task,
                ctx: {
                  ...ctx,
                  icon: (ctx && (ctx as Tag).icon) || (isFromProject && 'list')
                },
              })),
            );
          }))
          : of([])
        ),
        // TODO revisit typing here
      ) as any;
    } else {
      return of([]);
    }
  }
}
