import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
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
import { SS } from '../../../core/persistence/storage-keys.const';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../planner/store/planner.actions';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { MentionConfig } from 'angular-mentions/lib/mention-config';
import { AddTaskBarService } from './add-task-bar.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [blendInOutAnimation, slideAnimation, fadeAnimation],
})
export class AddTaskBarComponent implements AfterViewInit, OnDestroy {
  tabindex = input<number>(0);
  isDoubleEnterMode = input<boolean>(false);
  isElevated = input<boolean>(false);
  isHideTagTitles = input<boolean>(false);
  isDisableAutoFocus = input<boolean>(false);
  planForDay = input<string | undefined>(undefined);
  blurred = output<void>();
  done = output<void>();

  isAddToBottom = signal(false);
  isAddToBacklog = signal(false);
  isLoading = signal(false);
  doubleEnterCount = signal(0);

  @ViewChild('inputEl', { static: true }) inputEl?: ElementRef;

  T: typeof T = T;

  taskSuggestionsCtrl: UntypedFormControl = new UntypedFormControl();

  filteredIssueSuggestions$: Observable<AddTaskSuggestion[]> =
    this._addTaskBarService.getFilteredIssueSuggestions$(this.taskSuggestionsCtrl);

  activatedIssueTask$: BehaviorSubject<AddTaskSuggestion | null> =
    new BehaviorSubject<AddTaskSuggestion | null>(null);

  shortSyntaxTags$: Observable<ShortSyntaxTag[]> =
    this._addTaskBarService.getShortSyntaxTags$(this.taskSuggestionsCtrl);

  inputVal$: Observable<string> = this.taskSuggestionsCtrl.valueChanges;

  mentionConfig$: Observable<MentionConfig> = this._addTaskBarService.getMentionConfig$();

  isAddToBacklogAvailable$: Observable<boolean> =
    this._workContextService.activeWorkContext$.pipe(map((ctx) => !!ctx.isEnableBacklog));

  private _isAddInProgress?: boolean;
  private _lastAddedTaskId?: string;

  private _delayBlurTimeout?: number;
  private _autofocusTimeout?: number;
  private _attachKeyDownHandlerTimeout?: number;
  private _saveTmpTodoTimeout?: number;

  constructor(
    private _taskService: TaskService,
    private _workContextService: WorkContextService,
    private _store: Store,
    private _addTaskBarService: AddTaskBarService,
  ) {}

  ngAfterViewInit(): void {
    this.isAddToBottom.set(!!this.planForDay() || this.isAddToBottom());
    if (!this.isDisableAutoFocus()) {
      this._focusInput();
    }

    this._attachKeyDownHandlerTimeout = window.setTimeout(() => {
      (this.inputEl as ElementRef).nativeElement.addEventListener(
        'keydown',
        (ev: KeyboardEvent) => {
          if (ev.key === 'Escape') {
            this.blurred.emit();
            this.activatedIssueTask$.next(null);
          } else if (ev.key === '1' && ev.ctrlKey) {
            this.isAddToBottom.set(!this.isAddToBottom());
            ev.preventDefault();
          } else if (ev.key === '2' && ev.ctrlKey) {
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
        (this.inputEl as ElementRef).nativeElement.value = savedTodo;
        (this.inputEl as ElementRef).nativeElement.select();
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

    if (relatedTarget) {
      const { className } = relatedTarget;
      isUIelement =
        className.includes('switch-add-to-btn') ||
        className.includes('switch-add-to-bot-btn') ||
        className.includes('shepherd-enabled');
    }

    if (!relatedTarget || (relatedTarget && !isUIelement)) {
      sessionStorage.setItem(
        SS.TODO_TMP,
        (this.inputEl as ElementRef).nativeElement.value,
      );
    }

    if (relatedTarget && isUIelement) {
      (this.inputEl as ElementRef).nativeElement.focus();
    } else {
      this._delayBlurTimeout = window.setTimeout(() => {
        if (this._isAddInProgress) {
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
          {},
          this.isAddToBottom(),
        );
      } else if (this.doubleEnterCount() > 0) {
        this.blurred.emit();
        this.done.emit();
      } else if (this.isDoubleEnterMode()) {
        this.doubleEnterCount.set(this.doubleEnterCount() + 1);
      }
    } else if (item.taskId && item.isFromOtherContextAndTagOnlySearch) {
      this._lastAddedTaskId =
        await this._addTaskBarService.addTaskFromExistingTaskOrIssue(item);
    }

    if (this._lastAddedTaskId) {
      this._planForDayAfterAddTaskIfConfigured(this._lastAddedTaskId);
    }

    if (this.planForDay()) {
      this.blurred.emit();
    } else {
      this._focusInput();
    }

    this.taskSuggestionsCtrl.setValue('');
    this._isAddInProgress = false;
    sessionStorage.setItem(SS.TODO_TMP, '');
    this._isAddInProgress = false;
  }

  private _planForDayAfterAddTaskIfConfigured(taskId: string): void {
    const planForDay = this.planForDay();
    if (planForDay) {
      this._taskService.getByIdOnce$(taskId).subscribe((task) => {
        if (getWorklogStr() !== planForDay) {
          this._store.dispatch(
            PlannerActions.planTaskForDay({
              task: task,
              day: planForDay,
              isAddToTop: !this.isAddToBottom(),
            }),
          );
        }
      });
    }
  }

  private _focusInput(): void {
    if (IS_ANDROID_WEB_VIEW) {
      document.body.focus();
      (this.inputEl as ElementRef).nativeElement.focus();
      this._autofocusTimeout = window.setTimeout(() => {
        document.body.focus();
        (this.inputEl as ElementRef).nativeElement.focus();
      }, 1000);
    } else {
      this._autofocusTimeout = window.setTimeout(() => {
        (this.inputEl as ElementRef).nativeElement.focus();
      });
    }
  }
}
