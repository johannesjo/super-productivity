import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { T } from '../../t.const';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, combineLatest, from, Observable, Subscription } from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { Router } from '@angular/router';
import { DEFAULT_TAG, TODAY_TAG } from '../tag/tag.const';
import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';
import { ProjectService } from '../project/project.service';
import { TagService } from '../tag/tag.service';
import { Task } from '../tasks/task.model';
import { blendInOutAnimation } from 'src/app/ui/animations/blend-in-out.ani';
import { AnimationEvent } from '@angular/animations';
import { SearchItem, SearchQueryParams } from './search-bar.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { devError } from 'src/app/util/dev-error';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { IS_MOBILE } from 'src/app/util/is-mobile';

@Component({
  selector: 'search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  animations: [blendInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent implements AfterViewInit, OnDestroy {
  @Input() isElevated: boolean = false;
  @Output() blurred: EventEmitter<any> = new EventEmitter();

  @ViewChild('inputEl') inputEl!: ElementRef;
  @ViewChild('searchForm') searchForm!: ElementRef;
  @ViewChild(MatAutocompleteTrigger) autocomplete!: MatAutocompleteTrigger;

  T: typeof T = T;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  taskSuggestionsCtrl: FormControl = new FormControl();
  filteredIssueSuggestions$: Observable<SearchItem[]> = new Observable();
  isArchivedTasks: boolean = false;
  isArchivedTasks$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  tooManyResults: boolean = false;

  private _subs: Subscription = new Subscription();
  private _attachKeyDownHandlerTimeout?: number;
  private _openPanelTimeout?: number;
  private _tasks$: Observable<Task[]> = this.isArchivedTasks$.pipe(
    switchMap((isArchivedTasks) => this._loadTasks$(isArchivedTasks)),
  );

  private _searchableItems$: Observable<SearchItem[]> = this._tasks$.pipe(
    withLatestFrom(this._projectService.list$, this._tagService.tags$),
    map(([tasks, projects, tags]) => this._mapTasksToSearchItems(tasks, projects, tags)),
  );

  constructor(
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _tagService: TagService,
    private _router: Router,
  ) {}

  private _loadTasks$(isArchivedTasks: boolean): Observable<Task[]> {
    return !isArchivedTasks
      ? this._taskService.allTasks$
      : from(this._taskService.getArchivedTasks());
  }

  private _mapTasksToSearchItems(
    tasks: Task[],
    projects: Project[],
    tags: Tag[],
  ): SearchItem[] {
    return tasks.map((task) => {
      // By design subtasks cannot have tags.
      // If a subtask does not belong to a project, it will neither have a project nor a tag.
      // Therefore, we need to use the parent's tag.
      const tagId = task.parentId
        ? (tasks.find((t) => t.id === task.parentId) as Task).tagIds[0]
        : task.tagIds[0];

      return {
        id: task.id,
        title: task.title.toLowerCase(),
        taskNotes: task.notes.toLowerCase(),
        projectId: task.projectId,
        parentId: task.parentId,
        tagId,
        timeSpentOnDay: task.timeSpentOnDay,
        created: task.created,
        issueType: task.issueType,
        ctx: this._getContextIcon(task, projects, tags, tagId),
      };
    });
  }

  private _getContextIcon(
    task: Task,
    projects: Project[],
    tags: Tag[],
    tagId: string,
  ): Tag | Project {
    let context = task.projectId
      ? (projects.find((project) => project.id === task.projectId) as Project)
      : (tags.find((tag) => tag.id === tagId) as Tag);

    if (!context) {
      console.warn(`Could not find context for task: ${task.title}`);
      context = { ...DEFAULT_TAG, icon: 'help_outline', color: 'black' };
    }

    return {
      ...context,
      icon: (context as Tag).icon || (task.projectId && 'list'),
    };
  }

  ngAfterViewInit(): void {
    this.filteredIssueSuggestions$ = combineLatest([
      this._searchableItems$,
      this.taskSuggestionsCtrl.valueChanges.pipe(startWith('')),
    ]).pipe(
      debounceTime(100),
      tap(() => this.isLoading$.next(true)),
      filter(([searchableItems, searchTerm]) => typeof searchTerm === 'string'),
      map(([searchableItems, searchTerm]) => this._filter(searchableItems, searchTerm)),
      tap(() => this.isLoading$.next(false)),
    );

    this._attachKeyDownHandlerTimeout = window.setTimeout(() => {
      this.inputEl.nativeElement.addEventListener('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          this.blurred.emit();
        } else if (ev.key === '1' && ev.ctrlKey) {
          this.switchTaskSource();
          ev.preventDefault();
        } else if (
          ev.key === 'Enter' &&
          (!this.taskSuggestionsCtrl.value ||
            typeof this.taskSuggestionsCtrl.value === 'string')
        ) {
          this._shakeSearchForm();
          ev.preventDefault();
        }
      });
    });
  }

  private _getLocation(item: SearchItem): string {
    const tasksOrWorklog = !this.isArchivedTasks ? 'tasks' : 'worklog';
    if (item.projectId) {
      return `/project/${item.projectId}/${tasksOrWorklog}`;
    } else if (item.tagId === TODAY_TAG.id) {
      return `/tag/TODAY/${tasksOrWorklog}`;
    } else if (item.tagId) {
      return `/tag/${item.tagId}/${tasksOrWorklog}`;
    } else {
      devError("Couldn't find task location");
      return '';
    }
  }

  private _getArchivedDate(item: SearchItem, tasks: Task[]): string {
    let dateStr = Object.keys(item.timeSpentOnDay)[0];
    if (dateStr) return dateStr;

    if (item.parentId) {
      const parentTask = tasks.find((task) => task.id === item.parentId) as Task;
      dateStr = Object.keys(parentTask.timeSpentOnDay)[0];
      return dateStr ?? getWorklogStr(parentTask.created);
    }

    return getWorklogStr(item.created);
  }

  private _isInBacklog(item: SearchItem, projects: Project[]): boolean {
    if (!item.projectId) return false;
    const project = projects.find((p) => p.id === item.projectId);
    return project ? project.backlogTaskIds.includes(item.id) : false;
  }

  private _filter(searchableItems: SearchItem[], searchTerm: string): SearchItem[] {
    let result = searchableItems.filter(
      (task) =>
        task.title.includes(searchTerm.toLowerCase()) ||
        task.taskNotes.includes(searchTerm.toLowerCase()),
    );

    if (result.length > 200) {
      this.tooManyResults = true;
      result = result.slice(0, 200);
    } else {
      this.tooManyResults = false;
    }

    return result;
  }

  private _shakeSearchForm(): void {
    this.searchForm.nativeElement.classList.toggle('shake-form');
    this.searchForm.nativeElement.onanimationend = () => {
      this.searchForm.nativeElement.classList.toggle('shake-form');
    };
  }

  switchTaskSource(event?: MouseEvent) {
    // trigger on mousedown to keep inputEl in focus
    event?.preventDefault();
    this.isLoading$.next(true);
    this.isArchivedTasks = !this.isArchivedTasks;
    this.isArchivedTasks$.next(this.isArchivedTasks);
    if (IS_MOBILE) {
      this._openPanelTimeout = window.setTimeout(() => this.autocomplete.openPanel());
    }
  }

  onAnimationEvent(event: AnimationEvent) {
    if (event.fromState) {
      this.inputEl.nativeElement.focus();
    }
  }

  navigateToItem(item: SearchItem) {
    if (!item) return;
    this.isLoading$.next(true);
    const location = this._getLocation(item);
    const queryParams: SearchQueryParams = { focusItem: item.id };
    if (!this.isArchivedTasks) {
      this._subs.add(
        this._projectService.list$.subscribe((projects) => {
          this.blurred.emit();
          queryParams.isInBacklog = this._isInBacklog(item, projects);
          this._router.navigate([location], { queryParams });
        }),
      );
    } else {
      this._subs.add(
        this._tasks$.subscribe((tasks) => {
          this.blurred.emit();
          queryParams.dateStr = this._getArchivedDate(item, tasks);
          this._router.navigate([location], { queryParams });
        }),
      );
    }
  }

  getOptionText(item: SearchItem) {
    return item?.title;
  }

  onBlur(ev: FocusEvent) {
    const relatedTarget: HTMLElement = ev.relatedTarget as HTMLElement;
    if (!relatedTarget?.className.includes('mat-option')) {
      this.blurred.emit(ev);
    }
  }

  trackByFn(i: number, item: SearchItem) {
    return item.id;
  }

  closeBtnClose(ev: Event) {
    this.blurred.emit(ev);
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    if (this._attachKeyDownHandlerTimeout) {
      window.clearTimeout(this._attachKeyDownHandlerTimeout);
    }
    if (this._openPanelTimeout) window.clearTimeout(this._openPanelTimeout);
  }
}
