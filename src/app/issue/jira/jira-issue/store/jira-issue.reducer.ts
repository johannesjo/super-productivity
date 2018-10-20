import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { JiraIssueActions, JiraIssueActionTypes } from './jira-issue.actions';
import { JiraIssue } from '../jira-issue.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TaskActionTypes } from '../../../../tasks/store/task.actions';

export const JIRA_ISSUE_FEATURE_NAME = 'issues';

export interface JiraIssueState extends EntityState<JiraIssue> {
  // additional entities state properties
  currentJiraIssueId: string | null;
}

export const jiraIssueAdapter: EntityAdapter<JiraIssue> = createEntityAdapter<JiraIssue>();


// SELECTORS
// ---------
export const selectJiraIssueFeatureState = createFeatureSelector<JiraIssueState>(JIRA_ISSUE_FEATURE_NAME);

const {selectIds, selectEntities, selectAll, selectTotal} = jiraIssueAdapter.getSelectors();

export const selectJiraIssueIds = createSelector(selectJiraIssueFeatureState, selectIds);
export const selectJiraIssueEntities = createSelector(selectJiraIssueFeatureState, selectEntities);
export const selectAllJiraIssues = createSelector(selectJiraIssueFeatureState, selectAll);

// select the total user count
export const selectJiraIssueTotal = createSelector(selectJiraIssueFeatureState, selectTotal);

export const selectCurrentJiraIssue = createSelector(selectJiraIssueFeatureState, state => state.currentJiraIssueId);


// REDUCER
// -------
export const initialJiraIssueState: JiraIssueState = jiraIssueAdapter.getInitialState({
  currentJiraIssueId: null,
  entities: {
    'TEST': {
      id: 'string',
      key: 'string',
      url: 'string',
      summary: 'string',
      description: 'string',
      assigneeKey: 'string',
      updated: 'string',
      status: 'string',
      comments: ['any[]'],
      attachments: ['any[]'],
      estimate: 222,
      timeSpent: 333,
      components: ['string'],
    }
  },
  ids: ['TEST']
});

export function jiraIssueReducer(
  state = initialJiraIssueState,
  action: JiraIssueActions
): JiraIssueState {
  console.log(state.entities, state, action);

  switch (action.type) {
    // Meta Actions
    // ------------
    case JiraIssueActionTypes.LoadState: {
      return Object.assign({}, action.payload.state);
    }

    case TaskActionTypes.AddTaskWithIssue: {
      if (action.payload.task.issueType === 'JIRA') {
        return jiraIssueAdapter.addOne(action.payload.issue, state);
      }
      return state;
    }

    // JiraIssue Actions
    // ------------
    case JiraIssueActionTypes.AddJiraIssue: {
      return jiraIssueAdapter.addOne(action.payload.jiraIssue, state);
    }

    case JiraIssueActionTypes.AddJiraIssues: {
      return jiraIssueAdapter.addMany(action.payload.jiraIssues, state);
    }

    case JiraIssueActionTypes.UpdateJiraIssue: {
      return jiraIssueAdapter.updateOne(action.payload.jiraIssue, state);
    }

    case JiraIssueActionTypes.UpdateJiraIssues: {
      return jiraIssueAdapter.updateMany(action.payload.jiraIssues, state);
    }

    case JiraIssueActionTypes.DeleteJiraIssue: {
      return jiraIssueAdapter.removeOne(action.payload.id, state);
    }

    case JiraIssueActionTypes.DeleteJiraIssues: {
      return jiraIssueAdapter.removeMany(action.payload.ids, state);
    }

    case JiraIssueActionTypes.LoadJiraIssues: {
      return jiraIssueAdapter.addAll(action.payload.jiraIssues, state);
    }

    case JiraIssueActionTypes.ClearJiraIssues: {
      return jiraIssueAdapter.removeAll(state);
    }

    default: {
      return state;
    }
  }
}
