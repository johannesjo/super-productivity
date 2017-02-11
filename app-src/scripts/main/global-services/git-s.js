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
  function Git($resource, $localStorage) {
    const TYPE = 'GITHUB';
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

    return $resource(`https://api.github.com/repos/:user/:repo/:apiMethod`, {
      state: 'open',
      // we use functions here because we want dynamic parameters which change when settings change
      user: () => {
        return settings.repo.split('/')[0];
      },
      repo: () => {
        return settings.repo.split('/')[1];
      }
    }, {
      getIssueList: {
        transformResponse: transformIssueList,
        isArray: true,
        method: 'GET',
        params: {
          apiMethod: 'issues'
        }
      }
    });
  }

})();
