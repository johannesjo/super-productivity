/**
 * @ngdoc service
 * @name superProductivity.Git
 * @description
 * # Git
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('Git', Git);

  /* @ngInject */
  function Git($http, $localStorage) {
    const TYPE = 'GITHUB';
    const BASE_URL = 'https://api.github.com/';
    const settings = $localStorage.git;

    function mapIssue(issue) {
      let title;

      if (issue.pull_request) {
        title = `${settings.prPrefix} #${issue.number}: ${issue.title}`;
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
    }

    function transformIssueList(issues) {
      if (typeof issues === 'string') {
        issues = angular.fromJson(issues);
      }
      const newIssues = [];
      issues.forEach((issue) => {
        newIssues.push(mapIssue(issue));
      });
      return newIssues;
    }

    this.getIssueList = () => {
      return $http.get(BASE_URL + 'repos/' + settings.repo + '/issues', {
        transformResponse: [transformIssueList]
      });
    };

    function transformComments(comments) {
      if (typeof comments === 'string') {
        comments = angular.fromJson(comments);
      }
      const newComments = [];
      comments.forEach((comment) => {
        newComments.push({
          author: comment.user.login,
          body: comment.body,
          created: comment.created_at
        });
      });
      return newComments;
    }

    this.getCommentListForIssue = (issueNumber) => {
      return $http.get(BASE_URL + 'repos/' + settings.repo + '/issues/' + issueNumber + '/comments', {
        transformResponse: [transformComments]
      });
    };

  }

})();
