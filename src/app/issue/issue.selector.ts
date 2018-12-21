import { createSelector } from '@ngrx/store';
import { selectJiraIssueEntities } from './jira/jira-issue/store/jira-issue.reducer';
import { selectGitIssueEntities } from './git/git-issue/store/git-issue.reducer';

// TODO add git
export const selectIssueEntityMap = createSelector(
  selectJiraIssueEntities,
  selectGitIssueEntities,
  (
    (jiraIssues, gitIssues) => {
      return {
        JIRA: jiraIssues,
        GIT: gitIssues,
      };
    }
  )
);
