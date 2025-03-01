import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { TaskService } from '../task.service';
import { JiraIssue } from '../../issue/providers/jira/jira-issue/jira-issue.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { T } from '../../../t.const';
import { AddTaskSuggestion } from './add-task-suggestions.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { ShortSyntaxTag } from './short-syntax-to-tags';
import { slideAnimation } from '../../../ui/animations/slide.ani';
import { blendInOutAnimation } from 'src/app/ui/animations/blend-in-out.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { LS, SS } from '../../../core/persistence/storage-keys.const';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../planner/store/planner.actions';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { MentionConfig } from 'angular-mentions/lib/mention-config';
import { AddTaskBarService } from './add-task-bar.service';
import { map } from 'rxjs/operators';
import { selectEnabledIssueProviders } from '../../issue/store/issue-provider.selectors';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  MatAutocomplete,
  MatAutocompleteOrigin,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatInput } from '@angular/material/input';
import { MentionModule } from 'angular-mentions';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatOption } from '@angular/material/core';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { IssueIconPipe } from '../../issue/issue-icon/issue-icon.pipe';
import { TagComponent } from '../../tag/tag/tag.component';
import { TaskCopy } from '../task.model';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [blendInOutAnimation, slideAnimation, fadeAnimation],
  imports: [
    FormsModule,
    MatAutocompleteOrigin,
    MatProgressSpinner,
    MatInput,
    MatAutocompleteTrigger,
    ReactiveFormsModule,
    MentionModule,
    MatIconButton,
    MatIcon,
    MatTooltip,
    MatAutocomplete,
    MatOption,
    AsyncPipe,
    TranslatePipe,
    IssueIconPipe,
    TagComponent,
  ],
})
export class AddTaskBarComponent implements AfterViewInit, OnDestroy {
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);
  private _store = inject(Store);
  private _addTaskBarService = inject(AddTaskBarService);

  tabindex = input<number>(0);
  isDoubleEnterMode = input<boolean>(false);
  isElevated = input<boolean>(false);
  isHideTagTitles = input<boolean>(false);
  isDisableAutoFocus = input<boolean>(false);
  planForDay = input<string | undefined>(undefined);
  tagsToRemove = input<string[]>();
  additionalFields = input<Partial<TaskCopy>>();
  isSkipAddingCurrentTag = input<boolean>(false);
  taskIdsToExclude = input<string[]>();

  afterTaskAdd = output<{ taskId: string; isAddToBottom: boolean }>();
  blurred = output<void>();
  done = output<void>();

  isLoading = signal(false);
  doubleEnterCount = signal(0);
  isAddToBottom = signal(
    JSON.parse(localStorage.getItem(LS.IS_ADD_TO_BOTTOM) || 'false'),
  );
  isAddToBacklog = signal(false);
  isSearchIssueProviders = signal(false);
  isSearchIssueProviders$ = toObservable(this.isSearchIssueProviders);

  inputEl = viewChild<ElementRef>('inputEl');

  T: typeof T = T;

  taskSuggestionsCtrl: UntypedFormControl = new UntypedFormControl();

  filteredIssueSuggestions$: Observable<AddTaskSuggestion[]> = this._addTaskBarService
    .getFilteredIssueSuggestions$(
      this.taskSuggestionsCtrl,
      this.isSearchIssueProviders$,
      this.isLoading,
    )
    .pipe(
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

  activatedIssueTask$: BehaviorSubject<AddTaskSuggestion | null> =
    new BehaviorSubject<AddTaskSuggestion | null>(null);

  shortSyntaxTags$: Observable<ShortSyntaxTag[]> =
    this._addTaskBarService.getShortSyntaxTags$(this.taskSuggestionsCtrl);

  inputVal$: Observable<string> = this.taskSuggestionsCtrl.valueChanges;

  mentionConfig$: Observable<MentionConfig> = this._addTaskBarService.getMentionConfig$();

  isAddToBacklogAvailable$: Observable<boolean> =
    this._workContextService.activeWorkContext$.pipe(map((ctx) => !!ctx.isEnableBacklog));

  isSearchIssueProvidersAvailable$: Observable<boolean> = this._store
    .select(selectEnabledIssueProviders)
    .pipe(map((issueProviders) => issueProviders.length > 0));

  private _isAddInProgress?: boolean;
  private _lastAddedTaskId?: string;

  private _delayBlurTimeout?: number;
  private _autofocusTimeout?: number;
  private _attachKeyDownHandlerTimeout?: number;
  private _saveTmpTodoTimeout?: number;

  toggleIsAddToBottom(): void {
    this.isAddToBottom.set(!this.isAddToBottom());
    localStorage.setItem(LS.IS_ADD_TO_BOTTOM, JSON.stringify(this.isAddToBottom()));
  }

  ngAfterViewInit(): void {
    this.isAddToBottom.set(!!this.planForDay() || this.isAddToBottom());
    if (!this.isDisableAutoFocus()) {
      this._focusInput();
    }

    this._attachKeyDownHandlerTimeout = window.setTimeout(() => {
      (this.inputEl() as ElementRef).nativeElement.addEventListener(
        'keydown',
        (ev: KeyboardEvent) => {
          if (ev.key === 'Escape') {
            this.blurred.emit();
            this.activatedIssueTask$.next(null);
          } else if (ev.key === '1' && ev.ctrlKey) {
            this.toggleIsAddToBottom();
            ev.preventDefault();
          } else if (ev.key === '2' && ev.ctrlKey) {
            this.isSearchIssueProviders.set(!this.isSearchIssueProviders());
            ev.preventDefault();
          } else if (ev.key === '3' && ev.ctrlKey) {
            this.isAddToBacklog.set(!this.isAddToBacklog());
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
        (this.inputEl() as ElementRef).nativeElement.value = savedTodo;
        (this.inputEl() as ElementRef).nativeElement.select();
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
  }

  onOptionActivated(val: any): void {
    this.activatedIssueTask$.next(val);
  }

  onBlur(ev: FocusEvent): void {
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

    const inputEl = this.inputEl();
    if (!relatedTarget || (relatedTarget && !isUIelement)) {
      sessionStorage.setItem(SS.TODO_TMP, (inputEl as ElementRef).nativeElement.value);
    }

    if (relatedTarget && isUIelement) {
      (inputEl as ElementRef).nativeElement.focus();
    } else {
      // we need to wait since otherwise addTask is not working
      window.clearTimeout(this._delayBlurTimeout);
      this._delayBlurTimeout = window.setTimeout(() => {
        if (this._isAddInProgress) {
          window.clearTimeout(this._delayBlurTimeout);
          this._delayBlurTimeout = window.setTimeout(() => {
            this.blurred.emit();
          }, 300);
        } else {
          this.blurred.emit();
        }
      }, 220);
    }
  }

  displayWith(issue?: JiraIssue): string | undefined {
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
        this.doubleEnterCount.set(0);
        this._lastAddedTaskId = this._taskService.add(
          newTaskStr,
          this.isAddToBacklog(),
          {
            ...this.additionalFields(),
          },
          this.isAddToBottom(),
        );
      } else if (this.doubleEnterCount() > 0) {
        this.blurred.emit();
        this.done.emit();
      } else if (this.isDoubleEnterMode()) {
        this.doubleEnterCount.set(this.doubleEnterCount() + 1);
      }
    } else if (
      (item.taskId && item.isFromOtherContextAndTagOnlySearch) ||
      !!item.issueData
    ) {
      this._lastAddedTaskId =
        await this._addTaskBarService.addTaskFromExistingTaskOrIssue(
          item,
          this.isAddToBacklog(),
          !this.isSkipAddingCurrentTag(),
        );

      const additionalFields = this.additionalFields();
      const tagsToRemove = this.tagsToRemove();

      if (this._lastAddedTaskId && (additionalFields || tagsToRemove)) {
        const { tagIds, ...otherAdditionalFields } = additionalFields || { tagIds: [] };

        this._taskService.update(this._lastAddedTaskId, otherAdditionalFields);
        if (tagIds || tagsToRemove) {
          const task = await this._taskService
            .getByIdOnce$(this._lastAddedTaskId)
            .toPromise();
          console.log(additionalFields, tagsToRemove, task);

          this._taskService.updateTags(
            task,
            [...task.tagIds, ...(tagIds || [])].filter(
              (tagId) => !tagsToRemove || !tagsToRemove.includes(tagId),
            ),
          );
        }
      }
    }
    if (this._lastAddedTaskId) {
      this.afterTaskAdd.emit({
        taskId: this._lastAddedTaskId,
        isAddToBottom: this.isAddToBottom(),
      });
    }

    const planForDay = this.planForDay();
    if (planForDay) {
      this.blurred.emit();
      if (this._lastAddedTaskId) {
        this._planTaskForDay(this._lastAddedTaskId, planForDay);
      }
    } else {
      this._focusInput();
    }

    this.taskSuggestionsCtrl.setValue('');
    this._isAddInProgress = false;
    sessionStorage.setItem(SS.TODO_TMP, '');
    this._isAddInProgress = false;
  }

  private _planTaskForDay(taskId: string, day: string): void {
    this._taskService.getByIdOnce$(taskId).subscribe((task) => {
      if (getWorklogStr() !== day) {
        this._store.dispatch(
          PlannerActions.planTaskForDay({
            task: task,
            day,
            isAddToTop: !this.isAddToBottom(),
          }),
        );
      }
    });
  }

  private _focusInput(): void {
    if (IS_ANDROID_WEB_VIEW) {
      document.body.focus();
      (this.inputEl() as ElementRef).nativeElement.focus();
      this._autofocusTimeout = window.setTimeout(() => {
        document.body.focus();
        (this.inputEl() as ElementRef).nativeElement.focus();
      }, 1000);
    } else {
      this._autofocusTimeout = window.setTimeout(() => {
        (this.inputEl() as ElementRef).nativeElement.focus();
      });
    }
  }
}
