import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TaskService } from '../task.service';
import { JiraApiService } from '../../issue/jira/jira-api.service';
import { debounceTime, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { ProjectService } from '../../project/project.service';
import { JiraIssue } from '../../issue/jira/jira-issue/jira-issue.model';
import { Subject } from 'rxjs';
import { JiraIssueService } from '../../issue/jira/jira-issue/jira-issue.service';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss']
})
export class AddTaskBarComponent implements OnInit, OnDestroy, AfterViewInit {
  destroy$: Subject<boolean> = new Subject<boolean>();
  taskSuggestionsCtrl: FormControl = new FormControl();
  filteredIssueSuggestions: any[];
  isLoading = false;
  @Input() isAddToBacklog = false;
  @Input() placeholderTxt: string;
  @Input() isAutoFocus: boolean;
  @Output() blur: EventEmitter<any> = new EventEmitter();
  @ViewChild('inputEl') inputEl;

  constructor(
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _jiraApiService: JiraApiService,
    private _jiraIssueService: JiraIssueService,
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
      withLatestFrom(this._projectService.currentJiraCfg$),
      debounceTime(200),
      tap(([searchTerm, jiraCfg]) => {
        if (jiraCfg && jiraCfg.isEnabled) {
          this.isLoading = true;
        }
      }),
      switchMap(([searchTerm, jiraCfg]) => {
        if (searchTerm && searchTerm.length > 1 && jiraCfg && jiraCfg.isEnabled) {
          return this._jiraApiService.search(searchTerm, false, 50)
            .catch(() => {
              return [];
            });
        } else {
          // Note: the outer array signifies the observable stream the other is the value
          return [[]];
        }
      }),
      takeUntil(this.destroy$)
    )
      .subscribe((val) => {
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
    const issueOrTitle = this.taskSuggestionsCtrl.value;
    console.log(issueOrTitle);

    if (typeof issueOrTitle === 'string') {
      if (issueOrTitle.length > 0) {
        this._taskService.add(issueOrTitle, this.isAddToBacklog);
      }
    } else {
      this._taskService.addWithIssue(
        issueOrTitle.summary,
        'JIRA',
        issueOrTitle,
        this.isAddToBacklog,
      );
      // TODO move to issue effect
      // get full data
      this._jiraApiService.getIssueById(issueOrTitle.id)
        .then((issue) => {
          this._jiraIssueService.upsert(issue);
        });
    }

    this.taskSuggestionsCtrl.setValue('');
  }
}
