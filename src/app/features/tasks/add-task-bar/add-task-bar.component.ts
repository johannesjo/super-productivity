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
import {debounceTime, switchMap, tap} from 'rxjs/operators';
import {JiraIssue} from '../../issue/jira/jira-issue/jira-issue.model';
import {BehaviorSubject, Observable} from 'rxjs';
import {IssueService} from '../../issue/issue.service';
import {SearchResultItem} from '../../issue/issue';
import {SnackService} from '../../../core/snack/snack.service';
import {JiraApiService} from '../../issue/jira/jira-api.service';
import {JIRA_TYPE} from '../../issue/issue.const';
import {T} from '../../../t.const';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskBarComponent implements AfterViewInit, OnDestroy {
  @Input() isAddToBacklog = false;
  @Input() isAddToBottom;
  @Input() isElevated: boolean;
  @Input() isDisableAutoFocus: boolean;
  @Output() blurred: EventEmitter<any> = new EventEmitter();
  @Output() done: EventEmitter<any> = new EventEmitter();

  @ViewChild('inputEl', {static: true}) inputEl;

  T = T;
  isLoading$ = new BehaviorSubject(false);
  doubleEnterCount = 0;

  taskSuggestionsCtrl: FormControl = new FormControl();
  filteredIssueSuggestions$: Observable<SearchResultItem[]> = this.taskSuggestionsCtrl.valueChanges.pipe(
    debounceTime(300),
    tap(() => this.isLoading$.next(true)),
    switchMap((searchTerm) => {
      if (searchTerm && searchTerm.length > 0) {
        return this._issueService.searchIssues$(searchTerm);
      } else {
        // Note: the outer array signifies the observable stream the other is the value
        return [[]];
      }
    }),
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

  trackByFn(i: number, searchResultItem: SearchResultItem) {
    return searchResultItem.issueData.id;
  }

  async addTask() {
    this._isAddInProgress = true;
    const issueOrTitle = this.taskSuggestionsCtrl.value || '' as (string | SearchResultItem);

    if (typeof issueOrTitle === 'string') {
      if (issueOrTitle.length > 0) {
        this.doubleEnterCount = 0;
        this._taskService.add(
          issueOrTitle,
          this.isAddToBacklog,
          {},
          this.isAddToBottom
        );
      } else if (this.doubleEnterCount > 0) {
        this.blurred.emit();
        this.done.emit();
      } else {
        this.doubleEnterCount++;
      }
    } else {
      const issueData = (issueOrTitle.issueType === JIRA_TYPE)
        ? await this._jiraApiService.getIssueById$(issueOrTitle.issueData.id).toPromise()
        : issueOrTitle.issueData;

      const res = await this._taskService.checkForTaskWithIssue(issueData);
      if (!res) {
        this._taskService.addWithIssue(
          issueOrTitle.title,
          issueOrTitle.issueType,
          issueData,
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
          ico: 'info',
          msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
          translateParams: {title: res.task.title},
        });
      }
    }

    this.taskSuggestionsCtrl.setValue('');
    this._isAddInProgress = false;
  }
}
