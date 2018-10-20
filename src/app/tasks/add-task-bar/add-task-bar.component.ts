import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TaskService } from '../task.service';
import { JiraApiService } from '../../issue/jira/jira-api.service';
import { debounceTime, startWith, switchMap } from 'rxjs/operators';
import { ProjectService } from '../../project/project.service';
import { from, Observable } from 'rxjs';
import { TaskWithAllData } from '../task.model';
import { JiraIssue } from '../../issue/jira/jira-issue/jira-issue.model';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss']
})
export class AddTaskBarComponent {
  taskSuggestionsCtrl: FormControl;
  filteredIssueSuggestions: Observable<any[]>;
  newTask: Partial<TaskWithAllData>;

  constructor(
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _jiraApiService: JiraApiService,
  ) {

    this.taskSuggestionsCtrl = new FormControl();

    this.filteredIssueSuggestions =
      this.taskSuggestionsCtrl.valueChanges.pipe(
        startWith(null),
        debounceTime(200),
        // distinctUntilChanged(),
        switchMap(searchTerm => {
          if (searchTerm && searchTerm.length > 1) {
            return from(this._jiraApiService.search(searchTerm))
              .map((res) => {
                console.log(res);
                return res;
              });
          } else {
            return [];
          }
        })
      );
  }

  onSelectIssue(ev) {
    console.log(ev);
  }

  onBlur(ev) {
    console.log(ev);
  }

  displayWith(issue: JiraIssue) {
    return issue && issue.summary;
  }

  addTask() {
    console.log(this.taskSuggestionsCtrl.value);

    const issueOrTitle = this.taskSuggestionsCtrl.value;
    if (typeof issueOrTitle === 'string') {
      this._taskService.add(issueOrTitle);
    } else {
      this._taskService.addWithIssue(
        issueOrTitle.summary,
        'JIRA',
        issueOrTitle,
      );
    }
    this.taskSuggestionsCtrl.setValue('');
  }
}
