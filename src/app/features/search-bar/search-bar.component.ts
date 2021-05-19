import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { T } from '../../t.const';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map, take, debounceTime, startWith } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { Router } from '@angular/router';
import { TODAY_TAG } from '../tag/tag.const';
import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';
import { ProjectService } from '../project/project.service';
import { TagService } from '../tag/tag.service';
import { Task } from '../tasks/task.model';
import { blendInOutAnimation } from 'src/app/ui/animations/blend-in-out.ani';
import { AnimationEvent } from '@angular/animations';
import { SearchItem, SearchQueryParams } from './search-bar.model';
import { getWorklogStr } from '../../util/get-work-log-str';

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

  T: typeof T = T;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  taskSuggestionsCtrl: FormControl = new FormControl();
  filteredIssueSuggestions$: Observable<SearchItem[]> = new Observable();
  isArchivedTasks: boolean = false;
  tooManyResults: boolean = false;

  private _attachKeyDownHandlerTimeout?: number;
  private _tasks: Task[] = [];
  private _projects: Project[] = [];
  private _tags: Tag[] = [];
  private _searchableItems: SearchItem[] = [];

  constructor(
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _tagService: TagService,
    private _router: Router,
  ) {
    this._taskService.allTasks$.pipe(take(1)).subscribe((t) => (this._tasks = t));
    this._projectService.list$.pipe(take(1)).subscribe((p) => (this._projects = p));
    this._tagService.tags$.pipe(take(1)).subscribe((t) => (this._tags = t));

    this._mapTasksToSearchItems();
  }

  private _mapTasksToSearchItems(): void {
    this._searchableItems = this._tasks.map((task) => {
      const item: SearchItem = {
        id: task.id,
        title: task.title.toLowerCase(),
        taskNotes: task.notes ? task.notes.toLowerCase() : '',
        projectId: task.projectId,
        parentId: task.parentId,
        tagIds: task.tagIds,
        timeSpentOnDay: task.timeSpentOnDay,
        createdOn: task.created,
        issueType: task.issueType,
        ctx: this._getContextIcon(task),
      };
      return item;
    });
  }

  private _getContextIcon(task: Task) {
    const context = this._getCtxForTaskSuggestion(task);
    return {
      ...context,
      icon: (context as Tag).icon || (task.projectId && 'list'),
    };
  }

  ngAfterViewInit(): void {
    this._setUpFilter();

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

  private _triggerFilter(): void {
    this.taskSuggestionsCtrl.setValue(this.inputEl.nativeElement.value);
  }

  private _setUpFilter(): void {
    this.filteredIssueSuggestions$ = this.taskSuggestionsCtrl.valueChanges.pipe(
      debounceTime(100),
      startWith(''),
      tap(() => this.isLoading$.next(true)),
      map((searchTerm) => this._filter(searchTerm)),
      tap(() => this.isLoading$.next(false)),
    );
  }

  private _getLocation(item: SearchItem): string {
    const tasksOrWorklog = !this.isArchivedTasks ? 'tasks' : 'worklog';
    if (item.projectId) {
      return `/project/${item.projectId}/${tasksOrWorklog}`;
    } else if (item.tagIds.includes(TODAY_TAG.id)) {
      return `/tag/TODAY/${tasksOrWorklog}`;
    } else if (item.tagIds[0]) {
      return `/tag/${item.tagIds[0]}/${tasksOrWorklog}`;
    } else {
      console.warn("Couldn't find task location");
      return '';
    }
  }

  private _getArchivedDate(item: SearchItem): string {
    if (Object.keys(item.timeSpentOnDay)[0]) return Object.keys(item.timeSpentOnDay)[0];
    if (item.createdOn) return getWorklogStr(item.createdOn);
    const parentTask = this._tasks.find((t) => t.id === item.id);
    if (parentTask?.created) return getWorklogStr(parentTask.created);
    return '';
  }

  private _getCtxForTaskSuggestion(task: Task): Tag | Project {
    if (task.projectId) {
      return this._projects.find((project) => project.id === task.projectId) as Project;
    } else {
      if (!task.tagIds[0]) {
        throw new Error('No first tag');
      }
      return this._tags.find((tag) => tag.id === task.tagIds[0]) as Tag;
    }
  }

  private _isInBacklog(item: SearchItem): boolean {
    if (!item.projectId) return false;
    const project = this._projects.find((p) => p.id === item.projectId);
    return project ? project.backlogTaskIds.includes(item.id) : false;
  }

  private _filter(searchTerm: string): SearchItem[] {
    let result = this._searchableItems.filter(
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

  async switchTaskSource(event?: MouseEvent) {
    // trigger on mousedown to keep inputEl in focus
    event?.preventDefault();
    this.isLoading$.next(true);
    this.isArchivedTasks = !this.isArchivedTasks;
    this._tasks = this.isArchivedTasks
      ? await this._taskService.getArchivedTasks()
      : await this._taskService.allTasks$.pipe(take(1)).toPromise();
    this._mapTasksToSearchItems();
    this._triggerFilter();
  }

  onAnimationEvent(event: AnimationEvent) {
    if (event.fromState) {
      this.inputEl.nativeElement.focus();
    }
  }

  navigateToItem(item: SearchItem) {
    if (!item) return;

    const focusItem = item.id;
    let queryParams: SearchQueryParams;
    if (!this.isArchivedTasks) {
      const isInBacklog = this._isInBacklog(item);
      queryParams = { focusItem, isInBacklog };
    } else {
      const dateStr = this._getArchivedDate(item);
      queryParams = { focusItem, dateStr };
    }

    const location = this._getLocation(item);
    this._router.navigate([location], { queryParams });
    this.blurred.emit();
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
    if (this._attachKeyDownHandlerTimeout) {
      window.clearTimeout(this._attachKeyDownHandlerTimeout);
    }
  }
}
