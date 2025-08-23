import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatAutocomplete, MatOption } from '@angular/material/autocomplete';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { AddTaskSuggestion } from './add-task-suggestions.model';
import { IssueIconPipe } from '../../issue/issue-icon/issue-icon.pipe';
import { TagComponent } from '../../tag/tag/tag.component';
import { ProjectService } from '../../project/project.service';
import { AddTaskBarIssueSearchService } from './add-task-bar-issue-search.service';

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
  private readonly _addTaskBarService = inject(AddTaskBarIssueSearchService);
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
    const isSearchMode$ = toObservable(signal(this.isSearchMode));

    this.suggestions$ = this._addTaskBarService.getFilteredIssueSuggestions$(
      this.titleControl,
      isSearchMode$,
      this.isSearchLoading,
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
