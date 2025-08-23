import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatAutocomplete, MatOption } from '@angular/material/autocomplete';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { debounceTime, switchMap, map, catchError, tap, filter } from 'rxjs/operators';
import { AddTaskSuggestion } from './add-task-suggestions.model';
import { TaskService } from '../task.service';
import { IssueService } from '../../issue/issue.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { IssueIconPipe } from '../../issue/issue-icon/issue-icon.pipe';
import { TagComponent } from '../../tag/tag/tag.component';
import { ProjectService } from '../../project/project.service';

@Component({
  selector: 'add-task-bar-suggestions',
  template: `
    <mat-autocomplete
      #taskAutoEl="matAutocomplete"
      class="add-task-bar-panel"
      (optionActivated)="onOptionActivated($event?.option?.value)"
      (optionSelected)="onOptionSelected($event.option.value)"
      [autoActiveFirstOption]="true"
    >
      @for (
        item of suggestions$ | async;
        track item.taskId || (item.issueData && item.issueData.id)
      ) {
        <mat-option [value]="item">
          @if (item.issueType) {
            <mat-icon [svgIcon]="item.issueType | issueIcon"></mat-icon>
          } @else if (item.taskId && item.isArchivedTask) {
            <mat-icon>archive</mat-icon>
          } @else if (item.taskId) {
            <mat-icon>task</mat-icon>
          } @else if (!item.ctx) {
            <mat-icon>library_books</mat-icon>
          }
          @if (item.ctx) {
            <tag
              [tag]="item.ctx"
              [isHideTitle]="isHideTagTitles"
            ></tag>
          }
          <span [innerHTML]="item?.titleHighlighted || item?.title"></span>
          @if (item.taskId && item.projectId) {
            @for (project of projects$ | async; track project.id) {
              @if (project.id === item.projectId) {
                <mat-icon
                  class="project-icon"
                  [style.color]="project.theme.primary"
                >
                  {{ project.icon || 'folder' }}
                </mat-icon>
                <span class="project-title">{{ project.title }}</span>
              }
            }
          }
        </mat-option>
      }
    </mat-autocomplete>

    @if (isSearchLoading()) {
      <div class="spinner">
        <mat-spinner diameter="24"></mat-spinner>
      </div>
    }
  `,
  styles: [
    `
      .spinner {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
      }

      .project-icon {
        margin-left: 8px;
        font-size: 16px;
      }

      .project-title {
        margin-left: 4px;
        font-size: 12px;
        opacity: 0.7;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatAutocomplete,
    MatOption,
    MatIcon,
    MatProgressSpinner,
    AsyncPipe,
    IssueIconPipe,
    TagComponent,
  ],
})
export class AddTaskBarSuggestionsComponent implements OnInit {
  private readonly _taskService = inject(TaskService);
  private readonly _issueService = inject(IssueService);
  private readonly _workContextService = inject(WorkContextService);
  private readonly _projectService = inject(ProjectService);
  private readonly _destroyRef = inject(DestroyRef);

  @Input() titleControl!: FormControl<string | null>;
  @Input() isSearchMode = false;
  @Input() isHideTagTitles = false;

  @Output() suggestionActivated = new EventEmitter<AddTaskSuggestion | null>();
  @Output() suggestionSelected = new EventEmitter<AddTaskSuggestion>();

  readonly isSearchLoading = signal(false);
  readonly activatedSuggestion$ = new BehaviorSubject<AddTaskSuggestion | null>(null);

  suggestions$!: Observable<AddTaskSuggestion[]>;
  projects$ = this._projectService.list$;

  ngOnInit(): void {
    this._setupSuggestions();
    this._setupAutoActivation();
  }

  private _setupSuggestions(): void {
    this.suggestions$ = this.titleControl.valueChanges.pipe(
      filter(() => this.isSearchMode),
      tap(() => this.isSearchLoading.set(true)),
      debounceTime(300),
      switchMap((searchTerm) => {
        // Always clear loading state if no search term
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
                    issueType: issueSuggestion.issueProviderId,
                    issueProviderId: issueSuggestion.issueProviderId,
                  }) as AddTaskSuggestion,
              ),
            ),
            catchError(() => of([] as AddTaskSuggestion[])),
          );

        // Combine results
        return combineLatest([taskSearch$, issueSearch$]).pipe(
          map(([tasks, issues]) => [...tasks, ...issues]),
          tap(() => this.isSearchLoading.set(false)),
        );
      }),
      map((suggestions) => {
        // Deduplicate by taskId
        const seen = new Set<string>();
        return suggestions.filter((s) => {
          if (s.taskId) {
            if (seen.has(s.taskId)) return false;
            seen.add(s.taskId);
          }
          return true;
        });
      }),
    );
  }

  private _setupAutoActivation(): void {
    // Auto-activate first suggestion when autoActiveFirstOption is true
    this.suggestions$
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((suggestions) => {
        if (suggestions && suggestions.length > 0) {
          this.onOptionActivated(suggestions[0]);
        } else {
          this.onOptionActivated(null);
        }
      });
  }

  onOptionActivated(suggestion: AddTaskSuggestion | null): void {
    this.activatedSuggestion$.next(suggestion);
    this.suggestionActivated.emit(suggestion);
  }

  onOptionSelected(suggestion: AddTaskSuggestion): void {
    if (suggestion) {
      this.suggestionSelected.emit(suggestion);
    }
  }

  getAutocompleteInstance(): MatAutocomplete | null {
    // This method can be used by parent to access autocomplete state
    return null; // Will be implemented if needed
  }
}
