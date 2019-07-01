import {createEntityAdapter, EntityAdapter, EntityState} from '@ngrx/entity';
import {JiraIssueActions, JiraIssueActionTypes} from './jira-issue.actions';
import {JiraIssue} from '../jira-issue.model';
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {TaskActions, TaskActionTypes} from '../../../../tasks/store/task.actions';
import {IssueProviderKey} from '../../../issue';
import {JIRA_TYPE} from '../../../issue.const';

export const JIRA_ISSUE_FEATURE_NAME: IssueProviderKey = JIRA_TYPE;

export interface JiraIssueState extends EntityState<JiraIssue> {
  stateBefore?: JiraIssueState;
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
// DYNAMIC SELECTORS
// -----------------
export const selectJiraIssueById = createSelector(
  selectJiraIssueFeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);


// REDUCER
// -------
export const initialJiraIssueState: JiraIssueState = jiraIssueAdapter.getInitialState({
  stateBefore: null
});

export function jiraIssueReducer(
  state: JiraIssueState = initialJiraIssueState,
  action: JiraIssueActions | TaskActions
): JiraIssueState {

  switch (action.type) {
    // Meta Actions
    // ------------
    case JiraIssueActionTypes.LoadState: {
      return Object.assign({}, action.payload.state);
    }

    case TaskActionTypes.UndoDeleteTask: {
      return state.stateBefore || state;
    }

    case TaskActionTypes.AddTask: {
      if (action.payload.issue && action.payload.task.issueType === JIRA_TYPE) {
        const issue = action.payload.issue as JiraIssue;
        return jiraIssueAdapter.upsertOne(issue, state);
      }
      return state;
    }

    case TaskActionTypes.DeleteTask: {
      if (action.payload.task.issueType === JIRA_TYPE) {
        const issue = action.payload.task.issueData as JiraIssue;
        const ids = state.ids as string[];
        if (issue && issue.id && ids.includes(issue.id)) {
          return jiraIssueAdapter.removeOne(issue.id, {
            ...state,
            stateBefore: {...state, stateBefore: null}
          });
        } else {
          // don't crash app but warn strongly
          console.log('##########################################################');
          console.warn(' THIS SHOULD NOT HAPPEN: Jira Issue Data could not be found', issue, action, state);
          console.log('##########################################################');
          return state;
        }
        // TODO sub task case if we need it in the future
      }
      return state;
    }

    case TaskActionTypes.MoveToArchive: {
      const tasksWithJiraIssue = action.payload.tasks.filter(task => task.issueType === JIRA_TYPE);

      if (tasksWithJiraIssue && tasksWithJiraIssue.length > 0) {
        const issueIds = tasksWithJiraIssue.map(task => task.issueId)
          .filter((issueId) => {
            const ids = state.ids as string[];
            const isInState = ids.includes(issueId);
            if (!isInState) {
              // don't crash app but warn strongly
              console.log('##########################################################');
              console.warn(' THIS SHOULD NOT HAPPEN: Jira Issue could not be found', issueId, action, state);
              console.log('##########################################################');
            }
            return isInState;
          });

        return issueIds.length
          ? jiraIssueAdapter.removeMany(issueIds, state)
          : state;
      }

      return state;
    }

    case TaskActionTypes.RestoreTask: {
      if (action.payload.task.issueType === JIRA_TYPE) {
        const issue = action.payload.task.issueData as JiraIssue;
        return jiraIssueAdapter.upsertOne(issue, state);
        // TODO sub task case if we need it in the future
      }
      return state;
    }

    // JiraIssue Actions
    // ------------
    case JiraIssueActionTypes.UpsertJiraIssue: {
      return jiraIssueAdapter.upsertOne(action.payload.jiraIssue, state);
    }

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
