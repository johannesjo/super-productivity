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
import { Params, Router } from '@angular/router';
import { TODAY_TAG } from '../tag/tag.const';
import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';
import { ProjectService } from '../project/project.service';
import { TagService } from '../tag/tag.service';
import { Task } from '../tasks/task.model';
import { blendInOutAnimation } from 'src/app/ui/animations/blend-in-out.ani';
import { AnimationEvent } from '@angular/animations';
import { SearchItem } from './search-bar.model';

@Component({
  selector: 'search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  animations: [blendInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent implements AfterViewInit, OnDestroy {
  @Input() isElevated: boolean = false;
  @Input() tabindex: number = 0;
  @Output() blurred: EventEmitter<any> = new EventEmitter();

  @ViewChild('inputEl') inputEl!: ElementRef;
  @ViewChild('searchForm') searchForm!: ElementRef;

  T: typeof T = T;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  taskSuggestionsCtrl: FormControl = new FormControl();
  filteredIssueSuggestions$: Observable<SearchItem[]> = new Observable();

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

    this._searchableItems = this._tasks.map((task) => {
      const context = this._getCtxForTaskSuggestion(task);
      const item: SearchItem = {
        id: task.id,
        title: task.title.toLowerCase(),
        taskNotes: task.notes.toLowerCase(),
        location: SearchBarComponent._getLocation(task),
        issueType: task.issueType,
        isInBacklog: this._isInBacklog(task),
        ctx: {
          ...context,
          icon: (context as Tag).icon || (task.projectId && 'list'),
        },
      };
      return item;
    });
  }

  ngAfterViewInit(): void {
    this.filteredIssueSuggestions$ = this.taskSuggestionsCtrl.valueChanges.pipe(
      debounceTime(100),
      startWith(''),
      tap(() => this.isLoading$.next(true)),
      map((searchTerm) => this._filter(searchTerm)),
      tap(() => this.isLoading$.next(false)),
    );

    this._attachKeyDownHandlerTimeout = window.setTimeout(() => {
      this.inputEl.nativeElement.addEventListener('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          this.blurred.emit();
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

  private static _getLocation(task: Task): string {
    if (task.projectId) {
      return `project/${task.projectId}/tasks`;
    } else if (task.tagIds.includes(TODAY_TAG.id)) {
      return '/tag/TODAY/tasks';
    } else if (task.tagIds[0]) {
      return `/tag/${task.tagIds[0]}/tasks`;
    } else {
      console.warn("Couldn't find task location");
      return '/';
    }
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

  private _isInBacklog(task: Task): boolean {
    if (!task.projectId) return false;
    const project = this._projects.find((p) => p.id === task.projectId);
    return project ? project.backlogTaskIds.includes(task.id) : false;
  }

  private _filter(searchTerm: string): SearchItem[] {
    return this._searchableItems.filter(
      (task) =>
        task.title.includes(searchTerm.toLowerCase()) ||
        task.taskNotes.includes(searchTerm.toLowerCase()),
    );
  }

  private _shakeSearchForm(): void {
    this.searchForm.nativeElement.classList.toggle('shake-form');
    this.searchForm.nativeElement.onanimationend = () => {
      this.searchForm.nativeElement.classList.toggle('shake-form');
    };
  }

  onAnimationEvent(event: AnimationEvent) {
    if (event.fromState) {
      this.inputEl.nativeElement.focus();
    }
  }

  navigateToItem(item: SearchItem) {
    if (!item) return;
    const params: Params = {
      queryParams: {
        highlightItem: item.id,
        isInBacklog: item.isInBacklog,
      },
    };
    this._router.navigate([item.location], params);
    this.blurred.emit();
  }

  onBlur(ev: FocusEvent) {
    const relatedTarget: HTMLElement = ev.relatedTarget as HTMLElement;
    if (relatedTarget?.className.includes('switch-add-to-btn')) {
      this.inputEl.nativeElement.focus();
    } else if (!relatedTarget?.className.includes('mat-option')) {
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
