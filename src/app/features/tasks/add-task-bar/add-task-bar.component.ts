import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {TaskService} from '../task.service';
import {debounceTime, map, switchMap, tap} from 'rxjs/operators';
import {JiraIssue} from '../../issue/providers/jira/jira-issue/jira-issue.model';
import {BehaviorSubject, Observable, zip} from 'rxjs';
import {IssueService} from '../../issue/issue.service';
import {SnackService} from '../../../core/snack/snack.service';
import {JiraApiService} from '../../issue/providers/jira/jira-api.service';
import {T} from '../../../t.const';
import {Task} from '../task.model';
import {AddTaskSuggestion} from './add-task-suggestions.model';
import {WorkContextService} from '../../work-context/work-context.service';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskBarComponent implements AfterViewInit, OnDestroy {
  @Input() isAddToBacklog = false;
  @Input() isAddToBottom;
  @Input() isDoubleEnterMode = false;
  @Input() isElevated: boolean;
  @Input() isDisableAutoFocus: boolean;
  @Output() blurred: EventEmitter<any> = new EventEmitter();
  @Output() done: EventEmitter<any> = new EventEmitter();

  @ViewChild('inputEl', {static: true}) inputEl;

  T = T;
  isLoading$ = new BehaviorSubject(false);
  doubleEnterCount = 0;

  taskSuggestionsCtrl: FormControl = new FormControl();

  filteredIssueSuggestions$: Observable<(AddTaskSuggestion)[]> = this.taskSuggestionsCtrl.valueChanges.pipe(
    debounceTime(300),
    tap(() => this.isLoading$.next(true)),
    switchMap((searchTerm) => {
      if (searchTerm && searchTerm.length > 0) {
        const backlog$ = this._workContextService.backlogTasks$.pipe(
          map(tasks => tasks
            .filter(task => this._filterBacklog(searchTerm, task))
            .map((task): AddTaskSuggestion => ({
              title: task.title,
              taskId: task.id,
              taskIssueId: task.issueId,
              issueType: task.issueType,
            }))
          )
        );
        const issues$ = this._issueService.searchIssues$(searchTerm);
        return zip(backlog$, issues$).pipe(
          map(([backlog, issues]) => ([...backlog, ...issues])),
        );
      } else {
        // Note: the outer array signifies the observable stream the other is the value
        return [[]];
      }
    }),
    // don't show issues twice
    // NOTE: this only works because backlog items come first
    map((items: AddTaskSuggestion[]) => items.reduce(
      (unique: AddTaskSuggestion[], item: AddTaskSuggestion) => {
        return (item.issueData && unique.find(
          // NOTE: we check defined because we don't want to run into
          // false == false or similar
          u => u.taskIssueId && u.taskIssueId === item.issueData.id
        ))
          ? unique
          : [...unique, item];
      }, [])
    ),
    tap(() => {
      this.isLoading$.next(false);
    }),
  );

  private _isAddInProgress: boolean;
  private _blurTimeout: number;
  private _autofocusTimeout: number;
  private _attachKeyDownHandlerTimeout: number;

  constructor(
    private _taskService: TaskService,
    private _workContextService: WorkContextService,
    private _issueService: IssueService,
    private _jiraApiService: JiraApiService,
    private _snackService: SnackService,
    private _cd: ChangeDetectorRef,
  ) {
  }

  ngAfterViewInit(): void {
    this._autofocusTimeout = setTimeout(() => {
      if (!this.isDisableAutoFocus) {
        this.inputEl.nativeElement.focus();
      }
    });

    this._attachKeyDownHandlerTimeout = setTimeout(() => {
      this.inputEl.nativeElement.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          this.blurred.emit();
        } else if (ev.key === '1' && ev.ctrlKey === true) {
          this.isAddToBacklog = !this.isAddToBacklog;
          this._cd.detectChanges();
          ev.preventDefault();
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this._blurTimeout) {
      window.clearTimeout(this._blurTimeout);
    }
    if (this._attachKeyDownHandlerTimeout) {
      window.clearTimeout(this._attachKeyDownHandlerTimeout);
    }
  }

  onBlur(ev) {
    if (ev.relatedTarget && ev.relatedTarget.className.includes('switch-add-to-btn')) {
      this.inputEl.nativeElement.focus();
    } else if (ev.relatedTarget && ev.relatedTarget.className.includes('mat-option')) {
      this._blurTimeout = window.setTimeout(() => {
        if (!this._isAddInProgress) {
          this.blurred.emit(ev);
        }
      }, 300);
    } else {
      this.blurred.emit(ev);
    }
  }

  displayWith(issue: JiraIssue) {
    return issue && issue.summary;
  }

  trackByFn(i: number, item: AddTaskSuggestion) {
    return item.taskId || item.issueData.id;
  }

  async addTask() {
    this._isAddInProgress = true;
    const item: AddTaskSuggestion = this.taskSuggestionsCtrl.value;

    if (!item) {
      return;
    } else if (typeof item === 'string') {
      const newTaskStr = item as string;
      if (newTaskStr.length > 0) {
        this.doubleEnterCount = 0;
        this._taskService.add(
          newTaskStr,
          this.isAddToBacklog,
          {},
          this.isAddToBottom
        );
      } else if (this.doubleEnterCount > 0) {
        this.blurred.emit();
        this.done.emit();
      } else if (this.isDoubleEnterMode) {
        this.doubleEnterCount++;
      }
      // NOTE: it's important that this comes before the issue check
      // so that backlog issues are found first
    } else if (item.taskId) {
      this._taskService.moveToToday(item.taskId);
      this._snackService.open({
        ico: 'arrow_upward',
        msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
        translateParams: {title: item.title},
      });
    } else {
      const res = await this._taskService.checkForTaskWithIssue(item.issueData.id);
      if (!res) {
        this._issueService.addTaskWithIssue(
          item.issueType,
          item.issueData.id,
          this.isAddToBacklog,
        );
      } else if (res.isFromArchive) {
        this._taskService.restoreTask(res.task, res.subTasks);
        this._snackService.open({
          ico: 'info',
          msg: T.F.TASK.S.FOUND_RESTORE_FROM_ARCHIVE,
          translateParams: {title: res.task.title},
        });
      } else {
        this._taskService.moveToToday(res.task.id);
        this._snackService.open({
          ico: 'arrow_upward',
          msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
          translateParams: {title: res.task.title},
        });
      }
    }

    this.taskSuggestionsCtrl.setValue('');
    this._isAddInProgress = false;
  }

  private _filterBacklog(searchText: string, task: Task) {
    try {
      return task.title.toLowerCase().match(searchText.toLowerCase());
    } catch (e) {
      console.warn('RegEx Error', e);
      return false;
    }
  }
}
