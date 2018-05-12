/**
 * @ngdoc component
 * @name superProductivity.component:addTaskBar
 * @description
 * # addTaskBar
 */

class AddTaskBarCtrl {
  /* @ngInject */
  constructor(Git, Jira, $rootScope, $filter, Tasks) {
    this.Git = Git;
    this.Jira = Jira;
    this.$rootScope = $rootScope;
    this.$filter = $filter;
    this.Tasks = Tasks;
    this.taskSuggestions = [];
    this.refreshRemoteTasks();
  }

  getFilteredTaskSuggestions(searchText) {
    return searchText ? this.$filter('filter')(this.taskSuggestions, searchText, false, 'title') : this.taskSuggestions;
  }

  refreshRemoteTasks() {
    this.taskSuggestions = [];
    if (this.Jira.isSufficientJiraSettings()) {
      this.Jira.checkForNewAndAddToBacklog();

      this.Jira.getSuggestions().then((res) => {
        this.taskSuggestions = this.taskSuggestions.concat(this.Jira.transformIssues(res));
      });
    }

    // add new git tasks
    this.Git.checkForNewAndAddToBacklog();

    if (this.Git.isRepoConfigured() && this.$rootScope.r.git.isShowIssuesFromGit) {
      this.Git.getIssueList()
        .then((res) => {
          this.taskSuggestions = this.taskSuggestions.concat(res.data);
        });
    }
  }

  addTask() {
    if (this.newTask) {
      if (this.newTask.originalType && this.newTask.originalType === 'GITHUB' && this.$rootScope.r.git.isShowIssuesFromGit) {
        this.Git.getCommentListForIssue(this.newTask.originalId)
          .then(res => {
            this.newTask.originalComments = res.data;
            this.Tasks.addToday(this.newTask);
            this.newTask = undefined;
            this.newTaskTitle = undefined;
          });
      } else {
        this.Tasks.addToday(this.newTask);
        this.newTask = undefined;
        this.newTaskTitle = undefined;
      }

    } else if (this.newTaskTitle) {
      this.Tasks.addToday({
        title: this.newTaskTitle
      });
      this.newTaskTitle = undefined;
    } else if (this.onEmptySubmit) {
      this.onEmptySubmit();
    }
  }
}

angular
  .module('superProductivity')
  .component('addTaskBar', {
    template: require('./add-task-bar-cp.html'),
    controller: AddTaskBarCtrl,
    controllerAs: 'vm',
    bindings: {
      onEmptySubmit: '&',
      onBlur: '&',
      newTaskTitle: '=?'
    },
  });

// hacky fix for ff
AddTaskBarCtrl.$$ngIsClass = true;

