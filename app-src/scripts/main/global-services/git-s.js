/**
 * @ngdoc service
 * @name superProductivity.Git
 * @description
 * # Git
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .service('Git', Git);

  /* @ngInject */
  function Git($http, $rootScope, $injector, $q, Notifier, SimpleToast) {
    const TYPE = 'GITHUB';
    const BASE_URL = 'https://api.github.com/';
    const that = this;

    // PRIVATE HELPER FUNCTIONS
    // ------------------------
    function transformIssue(issue) {
      /*jshint camelcase: false */
      let title;

      if (typeof issue === 'string') {
        issue = angular.fromJson(issue);
      }

      if (issue.pull_request) {
        title = `${that.getSettings().prPrefix} #${issue.number}: ${issue.title}`;
      } else {
        title = `#${issue.number} ${issue.title}`;
      }

      return {
        originalId: issue.number,
        originalType: TYPE,
        originalLink: issue.html_url,
        originalStatus: issue.state,
        originalUpdated: moment(issue.updated_at),
        title: title,
        notes: issue.body
      };
      /*jshint camelcase: true */
    }

    function transformIssueList(issues) {
      if (typeof issues === 'string') {
        issues = angular.fromJson(issues);
      }
      const newIssues = [];
      issues.forEach((issue) => {
        newIssues.push(transformIssue(issue));
      });
      return newIssues;
    }

    function transformComments(comments) {
      if (typeof comments === 'string') {
        comments = angular.fromJson(comments);
      }
      const newComments = [];
      comments.forEach((comment) => {
        /*jshint camelcase: false */
        newComments.push({
          author: comment.user.login,
          body: comment.body,
          created: comment.created_at
        });
        /*jshint camelcase: true */
      });
      return newComments;
    }

    function taskIsUpdatedHandler(updatedTask) {
      if (updatedTask) {
        Notifier({
          title: 'Git Update',
          message: '"' + updatedTask.title + '" => has been updated as it was updated on Git.',
          sound: true,
          wait: true
        });
        SimpleToast('"' + updatedTask.title + '" => has been updated as it was updated on Git.');
      }
    }

    function createSimpleChangeLogForTask(updatedTask, oldTask) {
      const changeLog = [];

      if (updatedTask.title !== oldTask.title) {
        changeLog.push(createChangelogEntry('title', updatedTask.title));
      }
      if (updatedTask.notes !== oldTask.notes) {
        changeLog.push(createChangelogEntry('description', updatedTask.notes));
      }

      return changeLog;
    }

    function createChangelogEntry(changedField, changeToVal, author, date) {
      return {
        author: author,
        items: [{
          field: changedField,
          toString: changeToVal
        }],
        created: date
      };
    }

    // HELPER METHODS
    // --------------
    this.isGitTask = (task) => {
      return task && task.originalId && task.originalType === TYPE;
    };

    this.isRepoConfigured = () => {
      const settings = this.getSettings();
      return settings && settings.repo && settings.repo.trim() !== '';
    };

    this.getSettings = () => {
      return $rootScope.r && $rootScope.r.git;
    };

    // API METHODS
    // -----------
    this.getLatestSpRelease = () => {
      const SP_REPO_STR = BASE_URL + 'repos/johannesjo/super-productivity/releases/latest';
      return $http.get(SP_REPO_STR);
    };

    this.getIssueList = () => {
      if (!this.isRepoConfigured()) {
        return $q.reject();
      }

      return $http.get(BASE_URL + 'repos/' + this.getSettings().repo + '/issues', {
        transformResponse: [transformIssueList]
      });
    };

    this.getCommentListForIssue = (issueNumber) => {
      if (!this.isRepoConfigured()) {
        return $q.reject();
      }

      return $http.get(BASE_URL + 'repos/' + this.getSettings().repo + '/issues/' + issueNumber + '/comments', {
        transformResponse: [transformComments]
      });
    };

    this.getIssueById = (issueNumber) => {
      if (!this.isRepoConfigured()) {
        return $q.reject();
      }

      return $http.get(BASE_URL + 'repos/' + this.getSettings().repo + '/issues/' + issueNumber, {
        transformResponse: [transformIssue]
      });
    };

    // COMPLEXER WRAPPER METHODS
    // -------------------------
    this.checkAndUpdateTasks = (tasks) => {
      if (!this.isRepoConfigured()) {
        return $q.reject();
      }

      const TasksUtil = $injector.get('TasksUtil');
      const defer = $q.defer();

      const tasksToPoll = TasksUtil.flattenTasks(tasks, this.isGitTask, this.isGitTask);

      // execute requests sequentially to have a little more time
      const pollPromise = tasksToPoll.reduce((promise, task) =>
        promise.then(() =>
          this.getIssueById(task.originalId)
            .then((res) => {
              const issue = res.data;
              const lastUpdate = moment(task.originalUpdated);
              if (lastUpdate && moment(issue.originalUpdated).isAfter(lastUpdate)) {
                // add simple changelog
                if (!task.originalChangelog) {
                  task.originalChangelog = [];
                }

                task.originalChangelog = createSimpleChangeLogForTask(issue, task);

                // extend task with new values
                angular.extend(task, issue);
                task.isUpdated = true;
                taskIsUpdatedHandler(issue, task);

                // also update comment list in the next step
                this.getCommentListForIssue(task.originalId)
                  .then((res) => {
                    const comments = res.data;
                    if (comments.length !== task.originalComments.length) {
                      if (!task.originalChangelog) {
                        task.originalChangelog = [];
                      }

                      task.originalChangelog.push(createChangelogEntry('new comment added'));
                    }
                    task.originalComments = comments;
                  });
              }
            }, defer.reject)
        ), Promise.resolve()
      );

      pollPromise
        .then(() => {
          defer.resolve();
        });

      return defer.promise;
    };

    this.checkForNewAndAddToBacklog = () => {
      const Tasks = $injector.get('Tasks');

      if (this.isRepoConfigured() && $rootScope.r.git.isAutoImportToBacklog) {
        this.getIssueList()
          .then((res) => {
            const issues = res.data;
            _.each(issues, (issue) => {
              if (!Tasks.isTaskWithOriginalIdExistant(issue.originalId)) {
                const task = Tasks.createTask(issue);
                // the second param is the updateFromRemote flag
                Tasks.addNewToTopOfBacklog(task, true);
              }
            });
          });
      }
    };
  }

})();
