import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import { T } from '../../t.const';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  startWith,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { DEFAULT_TAG } from '../tag/tag.const';
import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';
import { ProjectService } from '../project/project.service';
import { TagService } from '../tag/tag.service';
import { Task } from '../tasks/task.model';
import { blendInOutAnimation } from 'src/app/ui/animations/blend-in-out.ani';
import { AnimationEvent } from '@angular/animations';
import { SearchItem } from './search-bar.model';
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  MatOption,
} from '@angular/material/autocomplete';
import { NavigateToTaskService } from '../../core-ui/navigate-to-task/navigate-to-task.service';
import { AsyncPipe } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { IssueIconPipe } from '../issue/issue-icon/issue-icon.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { TagComponent } from '../tag/tag/tag.component';

const MAX_RESULTS = 100;

@Component({
  selector: 'search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  animations: [blendInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    MatProgressSpinner,
    MatIcon,
    MatAutocompleteTrigger,
    ReactiveFormsModule,
    MatIconButton,
    MatInput,
    MatAutocomplete,
    MatOption,
    IssueIconPipe,
    TranslatePipe,
    TagComponent,
  ],
})
export class SearchBarComponent implements AfterViewInit, OnDestroy {
  private _taskService = inject(TaskService);
  private _projectService = inject(ProjectService);
  private _tagService = inject(TagService);
  private _navigateToTaskService = inject(NavigateToTaskService);

  readonly blurred = output<any | void>();

  readonly inputEl = viewChild.required<ElementRef>('inputEl');
  readonly searchForm = viewChild.required<ElementRef>('searchForm');
  readonly autocomplete = viewChild.required(MatAutocompleteTrigger);

  T: typeof T = T;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  taskSuggestionsCtrl: UntypedFormControl = new UntypedFormControl();
  filteredIssueSuggestions$: Observable<SearchItem[]> = new Observable();
  tooManyResults: boolean = false;

  private _subs: Subscription = new Subscription();
  private _attachKeyDownHandlerTimeout?: number;
  private _openPanelTimeout?: number;

  private _searchableItems$: Observable<SearchItem[]> = combineLatest([
    this._taskService.allTasks$,
    this._taskService.getArchivedTasks(),
  ]).pipe(
    withLatestFrom(this._projectService.list$, this._tagService.tags$),
    map(([[allTasks, archiveTasks], projects, tags]) => [
      ...this._mapTasksToSearchItems(false, allTasks, projects, tags),
      ...this._mapTasksToSearchItems(true, archiveTasks, projects, tags),
    ]),
  );

  private _mapTasksToSearchItems(
    isArchiveTask: boolean,
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
        taskNotes: task.notes?.toLowerCase() || '',
        projectId: task.projectId || null,
        parentId: task.parentId || null,
        tagId,
        timeSpentOnDay: task.timeSpentOnDay,
        created: task.created,
        issueType: task.issueType || null,
        ctx: this._getContextIcon(task, projects, tags, tagId),
        isArchiveTask,
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
      icon: (context as Tag).icon || (task.projectId && 'list') || null,
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
      this.inputEl().nativeElement.addEventListener('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          this.blurred.emit(undefined);
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

  private _filter(searchableItems: SearchItem[], searchTerm: string): SearchItem[] {
    let result = searchableItems.filter(
      (task) =>
        task.title.includes(searchTerm.toLowerCase()) ||
        task.taskNotes.includes(searchTerm.toLowerCase()),
    );

    if (result.length > MAX_RESULTS) {
      this.tooManyResults = true;
      result = result.slice(0, MAX_RESULTS);
    } else {
      this.tooManyResults = false;
    }

    return result;
  }

  private _shakeSearchForm(): void {
    this.searchForm().nativeElement.classList.toggle('shake-form');
    this.searchForm().nativeElement.onanimationend = () => {
      this.searchForm().nativeElement.classList.toggle('shake-form');
    };
  }

  onAnimationEvent(event: AnimationEvent): void {
    if (event.fromState) {
      this.inputEl().nativeElement.focus();
    }
  }

  navigateToItem(item: SearchItem): void {
    if (!item) return;
    this.isLoading$.next(true);
    this.blurred.emit(undefined);
    this._navigateToTaskService.navigate(item.id, item.isArchiveTask).then(() => {});
  }

  getOptionText(item: SearchItem): string {
    // NOTE: apparently item can be undefined for displayWith
    return item?.title;
  }

  onBlur(ev: FocusEvent): void {
    const relatedTarget: HTMLElement = ev.relatedTarget as HTMLElement;
    if (!relatedTarget?.className.includes('mat-option')) {
      // this.blurred.emit(ev);
    }
  }

  trackByFn(i: number, item: SearchItem): string {
    return item.id;
  }

  closeBtnClose(ev: Event): void {
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
