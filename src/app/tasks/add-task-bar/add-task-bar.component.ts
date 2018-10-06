import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs/Rx';
import { map, startWith } from 'rxjs/internal/operators';
import { TaskService } from '../task.service';

@Component({
  selector: 'add-task-bar',
  templateUrl: './add-task-bar.component.html',
  styleUrls: ['./add-task-bar.component.scss']
})
export class AddTaskBarComponent {
  taskSuggestionsCtrl: FormControl;
  filteredTaskSuggestions: Observable<any[]>;
  newTask: any;

  taskSuggestions: any = [
    {
      title: 'Arkansas',
    },
    {
      title: 'California',
    },
    {
      title: 'Florida',
    },
    {
      title: 'Texas',
    }
  ];

  constructor(private _taskService: TaskService) {
    this.taskSuggestionsCtrl = new FormControl();
    this.filteredTaskSuggestions = this.taskSuggestionsCtrl.valueChanges
      .pipe(
        startWith(''),
        map(
          task => task ? this.filterTaskSuggestions(task) : this.taskSuggestions.slice()
        )
      );
  }

  onBlur() {
  }

  filterTaskSuggestions(title: string) {
    return this.taskSuggestions.filter(task =>
      task.title.toLowerCase().indexOf(title.toLowerCase()) === 0);
  }

  addTask() {
    const newTaskTitle = this.taskSuggestionsCtrl.value;

    if (this.newTask) {
      if (this.newTask.originalType && this.newTask.originalType === 'GITHUB') {
        // this.Git.getCommentListForIssue(this.newTask.originalId)
        //   .then(res => {
        //     this.newTask.originalComments = res.data;
        //     this.Tasks.addToday(this.newTask);
        //     this.newTask = undefined;
        //     this.newTaskTitle = undefined;
        //   });
      } else {
        // this._taskService.addGithubTask(this.newTask);
        // this.newTask = undefined;
      }

    } else if (newTaskTitle) {
      this._taskService.addTask(newTaskTitle);
      this.taskSuggestionsCtrl.setValue('');
    }
    // else if (this.onEmptySubmit) {
    //   this.onEmptySubmit();
    // }
  }

  // refreshRemoteTasks() {
  //   this.taskSuggestions = [];
  //   if (this.Jira.isSufficientJiraSettings()) {
  //     this.Jira.checkForNewAndAddToBacklog();
  //
  //     this.Jira.getSuggestions().then((res) => {
  //       this.taskSuggestions = this.taskSuggestions.concat(this.Jira.transformIssues(res));
  //     });
  //   }
  //
  //   // add new git tasks
  //   this.Git.checkForNewAndAddToBacklog();
  //
  //   if (this.Git.isRepoConfigured() && this.$rootScope.r.git.isShowIssuesFromGit) {
  //     this.Git.getIssueList()
  //       .then((res) => {
  //         this.taskSuggestions = this.taskSuggestions.concat(res.data);
  //       });
  //   }
  // }
}
