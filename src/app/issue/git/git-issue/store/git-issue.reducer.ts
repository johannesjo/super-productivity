import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { GitIssueActions, GitIssueActionTypes } from './git-issue.actions';
import { GitIssue } from '../git-issue.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TaskActionTypes } from '../../../../tasks/store/task.actions';
import { IssueProviderKey } from '../../../issue';

export const GIT_ISSUE_FEATURE_NAME: IssueProviderKey = 'GIT';

export interface GitIssueState extends EntityState<GitIssue> {
}

export const gitIssueAdapter: EntityAdapter<GitIssue> = createEntityAdapter<GitIssue>();

// SELECTORS
// ---------
export const selectGitIssueFeatureState = createFeatureSelector<GitIssueState>(GIT_ISSUE_FEATURE_NAME);

const {selectIds, selectEntities, selectAll, selectTotal} = gitIssueAdapter.getSelectors();

export const selectGitIssueIds = createSelector(selectGitIssueFeatureState, selectIds);
export const selectGitIssueEntities = createSelector(selectGitIssueFeatureState, selectEntities);
export const selectAllGitIssues = createSelector(selectGitIssueFeatureState, selectAll);

// select the total user count
export const selectGitIssueTotal = createSelector(selectGitIssueFeatureState, selectTotal);


// REDUCER
// -------
export const initialGitIssueState: GitIssueState = gitIssueAdapter.getInitialState({});

export function gitIssueReducer(
  state: GitIssueState = initialGitIssueState,
  action: GitIssueActions
): GitIssueState {
  // console.log(state.entities, state, action);

  switch (action.type) {
    // Meta Actions
    // ------------
    case GitIssueActionTypes.LoadState: {
      return Object.assign({}, action.payload.state);
    }

    case TaskActionTypes.AddTask: {
      if (!action.payload.issue) {
        console.warn('No issue data provided, on adding task. (Only ok if getting an issue from archive)');
        return state;
      }

      if (action.payload.task.issueType === 'GIT') {
        const issue = action.payload.issue as GitIssue;
        return gitIssueAdapter.upsertOne(issue, state);
      }
      return state;
    }

    // GitIssue Actions
    // ------------
    case GitIssueActionTypes.UpsertGitIssue: {
      return gitIssueAdapter.upsertOne(action.payload.gitIssue, state);
    }

    case GitIssueActionTypes.AddGitIssue: {
      return gitIssueAdapter.addOne(action.payload.gitIssue, state);
    }

    case GitIssueActionTypes.AddGitIssues: {
      return gitIssueAdapter.addMany(action.payload.gitIssues, state);
    }

    case GitIssueActionTypes.UpdateGitIssue: {
      return gitIssueAdapter.updateOne(action.payload.gitIssue, state);
    }

    case GitIssueActionTypes.UpdateGitIssues: {
      return gitIssueAdapter.updateMany(action.payload.gitIssues, state);
    }

    case GitIssueActionTypes.DeleteGitIssue: {
      return gitIssueAdapter.removeOne(action.payload.id, state);
    }

    case GitIssueActionTypes.DeleteGitIssues: {
      return gitIssueAdapter.removeMany(action.payload.ids, state);
    }

    case GitIssueActionTypes.LoadGitIssues: {
      return gitIssueAdapter.addAll(action.payload.gitIssues, state);
    }

    case GitIssueActionTypes.ClearGitIssues: {
      return gitIssueAdapter.removeAll(state);
    }

    default: {
      return state;
    }
  }
}
