import {createSelector} from '@ngrx/store';
import {GITHUB_TYPE, JIRA_TYPE} from './issue.const';

// TODO add git
export const selectIssueEntityMap = createSelector(
  () => {
  },
  (
    (jiraIssues, gitIssues) => {
      return {
        [JIRA_TYPE]: jiraIssues,
        [GITHUB_TYPE]: gitIssues,
      };
    }
  )
);
