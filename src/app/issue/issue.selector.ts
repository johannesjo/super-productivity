import { createSelector } from '@ngrx/store';
import { selectJiraIssueEntities } from './jira/jira-issue/store/jira-issue.reducer';

export const selectIssueEntityMap = createSelector(
  selectJiraIssueEntities,
  (
    (jiraIssues) => {
      return {
        JIRA: jiraIssues
      };
    }
  )
);
