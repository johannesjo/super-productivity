import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TaskService } from '../task.service';
import { JiraApiService } from '../../issue/jira/jira-api.service';
import { debounceTime, switchMap, takeUntil, tap, throttle, withLatestFrom } from 'rxjs/operators';
import { ProjectService } from '../../project/project.service';
import { JiraIssue } from '../../issue/jira/jira-issue/jira-issue.model';
import { Subject } from 'rxjs';
import { JiraIssueService } from '../../issue/jira/jira-issue/jira-issue.service';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss']
})
export class AddTaskBarComponent implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject<boolean>();
  taskSuggestionsCtrl: FormControl = new FormControl();
  filteredIssueSuggestions: any[];
  isLoading = false;

  constructor(
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _jiraApiService: JiraApiService,
    private _jiraIssueService: JiraIssueService,
  ) {
  }

  ngOnInit() {
    this.taskSuggestionsCtrl.setValue('');
    this.taskSuggestionsCtrl.valueChanges.pipe(
      withLatestFrom(this._projectService.currentJiraCfg$),
      debounceTime(400),
      tap(([searchTerm, jiraCfg]) => {
        if (jiraCfg && jiraCfg.isEnabled) {
          this.isLoading = true;
        }
      }),
      switchMap(([searchTerm, jiraCfg]) => {
        if (searchTerm && searchTerm.length > 1 && jiraCfg && jiraCfg.isEnabled) {
          return this._jiraApiService.search(searchTerm);
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

  onBlur() {
  }

  displayWith(issue: JiraIssue) {
    return issue && issue.summary;
  }

  addTask() {
    const issueOrTitle = this.taskSuggestionsCtrl.value;
    console.log(issueOrTitle);

    if (typeof issueOrTitle === 'string') {
      this._taskService.add(issueOrTitle,true);
    } else {
      this._taskService.addWithIssue(
        issueOrTitle.summary,
        'JIRA',
        issueOrTitle,
      );
      // get full data
      this._jiraApiService.getIssueById(issueOrTitle.id)
        .then((issue) => {
          this._jiraIssueService.add(issue);
        });
    }

    this.taskSuggestionsCtrl.setValue('');
  }
}
