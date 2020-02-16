import {createSelector} from '@ngrx/store';
import {selectJiraIssueEntities} from './jira/jira-issue/store/jira-issue.reducer';
import {GITHUB_TYPE, JIRA_TYPE} from './issue.const';

// TODO add git
export const selectIssueEntityMap = createSelector(
  selectJiraIssueEntities,
  (
    (jiraIssues, gitIssues) => {
      return {
        [JIRA_TYPE]: jiraIssues,
        [GITHUB_TYPE]: gitIssues,
      };
    }
  )
);
