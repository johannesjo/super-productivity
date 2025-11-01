import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { T } from '../../t.const';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { debounceTime, filter, map, startWith, withLatestFrom } from 'rxjs/operators';
import { TaskService } from '../../features/tasks/task.service';
import { DEFAULT_TAG } from '../../features/tag/tag.const';
import { Project } from '../../features/project/project.model';
import { Tag } from '../../features/tag/tag.model';
import { ProjectService } from '../../features/project/project.service';
import { TagService } from '../../features/tag/tag.service';
import { Task } from '../../features/tasks/task.model';
import { SearchItem } from './search-page.model';
import { NavigateToTaskService } from '../../core-ui/navigate-to-task/navigate-to-task.service';
import { AsyncPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { IssueIconPipe } from '../../features/issue/issue-icon/issue-icon.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { TagComponent } from '../../features/tag/tag/tag.component';
import { MatList, MatListItem } from '@angular/material/list';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { Log } from '../../core/log';

const MAX_RESULTS = 50;

@Component({
  selector: 'search-page',
  templateUrl: './search-page.component.html',
  styleUrls: ['./search-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    MatIcon,
    ReactiveFormsModule,
    MatIconButton,
    MatInput,
    IssueIconPipe,
    TranslatePipe,
    TagComponent,
    MatList,
    MatListItem,
    MatFormField,
    MatLabel,
  ],
})
export class SearchPageComponent implements OnInit {
  private _taskService = inject(TaskService);
  private _projectService = inject(ProjectService);
  private _tagService = inject(TagService);
  private _navigateToTaskService = inject(NavigateToTaskService);

  readonly inputEl = viewChild.required<ElementRef>('inputEl');

  T: typeof T = T;
  searchForm: UntypedFormControl = new UntypedFormControl('');
  filteredResults$: Observable<SearchItem[]> = new Observable();

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
        title: task.title,
        taskNotes: task.notes || '',
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
      Log.err(`Could not find context for task: ${task.title}`);
      context = { ...DEFAULT_TAG, icon: 'help_outline', color: 'black' };
    }

    return {
      ...context,
      icon: (context as Tag).icon || (task.projectId && 'list') || null,
    };
  }

  ngOnInit(): void {
    this.filteredResults$ = combineLatest([
      this._searchableItems$,
      this.searchForm.valueChanges.pipe(startWith('')),
    ]).pipe(
      debounceTime(150),
      filter(([searchableItems, searchTerm]) => typeof searchTerm === 'string'),
      map(([searchableItems, searchTerm]) => this._filter(searchableItems, searchTerm)),
    );

    // Focus the input after view init
    setTimeout(() => {
      this.inputEl().nativeElement.focus();
    }, 100);
  }

  private _filter(searchableItems: SearchItem[], searchTerm: string): SearchItem[] {
    if (!searchTerm.trim()) {
      return [];
    }

    const result = searchableItems.filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.taskNotes.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return result.slice(0, MAX_RESULTS);
  }

  navigateToItem(item: SearchItem): void {
    if (!item) return;
    this._navigateToTaskService.navigate(item.id, item.isArchiveTask).then(() => {});
  }

  clearSearch(): void {
    this.searchForm.setValue('');
    this.inputEl().nativeElement.focus();
  }

  trackByFn(i: number, item: SearchItem): string {
    return item.id;
  }
}
