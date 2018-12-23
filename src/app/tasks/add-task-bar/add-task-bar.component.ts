import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TaskService } from '../task.service';
import { debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { JiraIssue } from '../../issue/jira/jira-issue/jira-issue.model';
import { Subject } from 'rxjs';
import { IssueService } from '../../issue/issue.service';
import { SearchResultItem } from '../../issue/issue';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss']
})
export class AddTaskBarComponent implements OnInit, OnDestroy, AfterViewInit {
  destroy$: Subject<boolean> = new Subject<boolean>();
  taskSuggestionsCtrl: FormControl = new FormControl();
  filteredIssueSuggestions: SearchResultItem[];
  isLoading = false;
  doubleEnterCount = 0;


  @Input() isAddToBacklog = false;
  @Input() isAddToBottom;
  @Input() isAutoFocus: boolean;
  @Output() blur: EventEmitter<any> = new EventEmitter();
  @Output() done: EventEmitter<any> = new EventEmitter();

  @ViewChild('inputEl') inputEl;

  constructor(
    private _taskService: TaskService,
    private _issueService: IssueService,
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

  ngOnInit() {
    this.taskSuggestionsCtrl.setValue('');

    this.taskSuggestionsCtrl.valueChanges.pipe(
      debounceTime(400),
      switchMap((searchTerm) => {
        if (searchTerm && searchTerm.length > 1) {
          this.isLoading = true;
          return this._issueService.searchIssues(searchTerm);
        } else {
          // Note: the outer array signifies the observable stream the other is the value
          return [[]];
        }
      }),
      takeUntil(this.destroy$)
    )
      .subscribe((val) => {
        console.log('sub', val);

        this.isLoading = false;
        this.filteredIssueSuggestions = val;
      });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onBlur(ev) {
    if (ev.relatedTarget && ev.relatedTarget.className.includes('switch-add-to-btn')) {
      this.inputEl.nativeElement.focus();
    } else {
      this.blur.emit(ev);
    }
  }

  displayWith(issue: JiraIssue) {
    return issue && issue.summary;
  }

  addTask() {
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
      this._taskService.addWithIssue(
        issueOrTitle.title,
        issueOrTitle.issueType,
        issueOrTitle.issueData,
        this.isAddToBacklog,
      );
      // // TODO move to issue effect
      // // get full data
      // this._jiraApiService.getIssueById(issueOrTitle.id)
      //   .then((issue) => {
      //     this._jiraIssueService.upsert(issue);
      //   });
    }

    this.taskSuggestionsCtrl.setValue('');
  }
}
