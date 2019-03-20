import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { TaskService } from '../task.service';
import { debounceTime, switchMap, tap } from 'rxjs/operators';
import { JiraIssue } from '../../issue/jira/jira-issue/jira-issue.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { IssueService } from '../../issue/issue.service';
import { SearchResultItem } from '../../issue/issue';
import { SnackService } from '../../../core/snack/snack.service';
import { JiraApiService } from '../../issue/jira/jira-api.service';
import { JIRA_TYPE } from '../../issue/issue.const';
import { truncate } from '../../../util/truncate';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskBarComponent implements AfterViewInit, OnDestroy {
  @Input() isAddToBacklog = false;
  @Input() isAddToBottom;
  @Input() isAutoFocus: boolean;
  @Output() blur: EventEmitter<any> = new EventEmitter();
  @Output() done: EventEmitter<any> = new EventEmitter();

  @ViewChild('inputEl') inputEl;

  isLoading$ = new BehaviorSubject(false);
  doubleEnterCount = 0;

  taskSuggestionsCtrl: FormControl = new FormControl();
  filteredIssueSuggestions$: Observable<SearchResultItem[]> = this.taskSuggestionsCtrl.valueChanges.pipe(
    debounceTime(300),
    tap(() => this.isLoading$.next(true)),
    switchMap((searchTerm) => {
      if (searchTerm && searchTerm.length > 0) {
        return this._issueService.searchIssues(searchTerm);
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

  constructor(
    private _taskService: TaskService,
    private _issueService: IssueService,
    private _jiraApiService: JiraApiService,
    private _snackService: SnackService,
  ) {
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.inputEl.nativeElement.focus();
      this.inputEl.nativeElement.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          this.blur.emit();
        } else if (ev.key === '1' && ev.ctrlKey === true) {
          this.isAddToBacklog = !this.isAddToBacklog;
          ev.preventDefault();
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this._blurTimeout) {
      window.clearTimeout(this._blurTimeout);
    }
  }

  onBlur(ev) {
    console.log(ev);
    if (ev.relatedTarget && ev.relatedTarget.className.includes('switch-add-to-btn')) {
      this.inputEl.nativeElement.focus();
    } else if (ev.relatedTarget && ev.relatedTarget.className.includes('mat-option')) {
      this._blurTimeout = window.setTimeout(() => {
        if (!this._isAddInProgress) {
          this.blur.emit(ev);
        }
      }, 300);
    } else {
      this.blur.emit(ev);
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
    const issueOrTitle = this.taskSuggestionsCtrl.value as string | SearchResultItem;
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
        this.blur.emit();
        this.done.emit();
      } else {
        this.doubleEnterCount++;
      }
    } else {
      const issueData = (issueOrTitle.issueType === JIRA_TYPE)
        ? await this._jiraApiService.getIssueById(issueOrTitle.issueData.id).toPromise()
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
        this._taskService.restoreTask(res.task);
        this._snackService.open({
          ico: 'info',
          msg: `Restored task <strong>${truncate(res.task.title)}</strong> related to issue from archive`
        });
      } else {
        this._taskService.moveToToday(res.task.id);
        this._snackService.open({
          ico: 'info',
          msg: `Moved existing task <strong>${truncate(res.task.title)}</strong> to todays task list`
        });
      }
    }

    this.taskSuggestionsCtrl.setValue('');
    this._isAddInProgress = false;
  }
}
