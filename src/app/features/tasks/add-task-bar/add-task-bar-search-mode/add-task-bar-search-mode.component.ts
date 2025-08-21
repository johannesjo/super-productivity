import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  input,
  signal,
  viewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  MatOption,
} from '@angular/material/autocomplete';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TaskService } from '../../task.service';
import { WorkContextService } from '../../../work-context/work-context.service';
import { IssueService } from '../../../issue/issue.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { T } from '../../../../t.const';
import { AddTaskSuggestion } from '../add-task-suggestions.model';
import { AddTaskBarService } from '../add-task-bar.service';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { debounceTime, switchMap, map, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { IssueIconPipe } from '../../../issue/issue-icon/issue-icon.pipe';
import { TagComponent } from '../../../tag/tag/tag.component';
import { IS_ANDROID_WEB_VIEW } from '../../../../util/is-android-web-view';
import { truncate } from '../../../../util/truncate';
import { WorkContextType } from '../../../work-context/work-context.model';

@Component({
  selector: 'add-task-bar-search-mode',
  templateUrl: './add-task-bar-search-mode.component.html',
  styleUrls: ['./add-task-bar-search-mode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInput,
    MatIconButton,
    MatIcon,
    MatTooltip,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    MatProgressSpinner,
    AsyncPipe,
    TranslatePipe,
    IssueIconPipe,
    TagComponent,
  ],
})
export class AddTaskBarSearchModeComponent implements AfterViewInit {
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);
  private _issueService = inject(IssueService);
  private _snackService = inject(SnackService);
  private _addTaskBarService = inject(AddTaskBarService);

  tabindex = input<number>(0);
  isElevated = input<boolean>(false);
  isDisableAutoFocus = input<boolean>(false);
  isAddToBacklog = input<boolean>(false);
  taskIdsToExclude = input<string[]>();

  afterTaskAdd = output<{ taskId: string; isAddToBottom: boolean }>();
  blurred = output<void>();
  switchToAddMode = output<void>();

  T = T;

  inputEl = viewChild<ElementRef>('inputEl');
  searchControl = new FormControl<string>('');

  isLoading = signal(false);

  activatedSuggestion$ = new BehaviorSubject<AddTaskSuggestion | null>(null);

  suggestions$: Observable<AddTaskSuggestion[]> = this.searchControl.valueChanges.pipe(
    tap(() => this.isLoading.set(true)),
    debounceTime(300),
    switchMap((searchTerm) => {
      if (!searchTerm || typeof searchTerm !== 'string') {
        this.isLoading.set(false);
        return of([]);
      }

      // Search both tasks and issues simultaneously
      const taskSearch$ = this._taskService.allTasks$.pipe(
        map((tasks) => {
          const searchLower = searchTerm.toLowerCase();
          return tasks
            .filter((task) => task.title.toLowerCase().includes(searchLower))
            .slice(0, 15) // Limit task results to leave room for issues
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

      const issueSearch$ = this._issueService
        .searchAllEnabledIssueProviders$(searchTerm)
        .pipe(
          map((issueSuggestions) =>
            issueSuggestions.slice(0, 15).map(
              // Limit issue results
              (issueSuggestion) =>
                ({
                  title: issueSuggestion.title,
                  titleHighlighted: issueSuggestion.titleHighlighted,
                  issueData: issueSuggestion.issueData,
                  issueType: issueSuggestion.issueType,
                  issueProviderId: issueSuggestion.issueProviderId,
                }) as AddTaskSuggestion,
            ),
          ),
          catchError(() => of([] as AddTaskSuggestion[])),
        );

      // Combine both searches
      return combineLatest([taskSearch$, issueSearch$]).pipe(
        map(([tasks, issues]) => [...tasks, ...issues]),
        tap(() => this.isLoading.set(false)),
      );
    }),
    map((suggestions) => {
      const taskIdsToExclude = this.taskIdsToExclude() || [];
      return suggestions.filter((s) => {
        if (s.taskId) {
          return !taskIdsToExclude.includes(s.taskId);
        }
        return true;
      });
    }),
  );

  ngAfterViewInit(): void {
    if (!this.isDisableAutoFocus()) {
      this._focusInput();
    }

    const inputElement = (this.inputEl() as ElementRef).nativeElement;
    inputElement.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (this.searchControl.value) {
          this.searchControl.setValue('');
        } else {
          this.switchToAddMode.emit();
        }
      }
    });
  }

  onOptionActivated(suggestion: AddTaskSuggestion | null): void {
    this.activatedSuggestion$.next(suggestion);
  }

  async onOptionSelected(suggestion: AddTaskSuggestion): Promise<void> {
    if (!suggestion) return;

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
      if (suggestion.projectId) {
        this._taskService.getByIdOnce$(suggestion.taskId).subscribe((task) => {
          this._taskService.moveToCurrentWorkContext(task);
        });
        this._snackService.open({
          ico: 'arrow_upward',
          msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
          translateParams: { title: suggestion.title },
        });
        taskId = suggestion.taskId;
      }
    } else if (suggestion.issueType && suggestion.issueData) {
      taskId = await this._addTaskBarService.addTaskFromExistingTaskOrIssue(
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
      this.searchControl.setValue('');
      this.switchToAddMode.emit();
    }
  }

  private _focusInput(): void {
    if (IS_ANDROID_WEB_VIEW) {
      document.body.focus();
      (this.inputEl() as ElementRef).nativeElement.focus();
      setTimeout(() => {
        document.body.focus();
        (this.inputEl() as ElementRef).nativeElement.focus();
      }, 1000);
    } else {
      setTimeout(() => {
        (this.inputEl() as ElementRef).nativeElement.focus();
      });
    }
  }
}
