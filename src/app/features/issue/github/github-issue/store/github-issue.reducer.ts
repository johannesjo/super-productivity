import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { GithubIssueActions, GithubIssueActionTypes } from './github-issue.actions';
import { GithubIssue } from '../github-issue.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TaskActions, TaskActionTypes } from '../../../../tasks/store/task.actions';
import { IssueProviderKey } from '../../../issue';
import { GITHUB_TYPE } from '../../../issue.const';

export const GITHUB_ISSUE_FEATURE_NAME: IssueProviderKey = GITHUB_TYPE;

export interface GithubIssueState extends EntityState<GithubIssue> {
  stateBefore?: GithubIssueState;
}

export const githubIssueAdapter: EntityAdapter<GithubIssue> = createEntityAdapter<GithubIssue>();

// SELECTORS
// ---------
export const selectGithubIssueFeatureState = createFeatureSelector<GithubIssueState>(GITHUB_ISSUE_FEATURE_NAME);

const {selectIds, selectEntities, selectAll, selectTotal} = githubIssueAdapter.getSelectors();

export const selectGithubIssueIds = createSelector(selectGithubIssueFeatureState, selectIds);
export const selectGithubIssueEntities = createSelector(selectGithubIssueFeatureState, selectEntities);
export const selectAllGithubIssues = createSelector(selectGithubIssueFeatureState, selectAll);

// select the total user count
export const selectGithubIssueTotal = createSelector(selectGithubIssueFeatureState, selectTotal);
// DYNAMIC SELECTORS
// -----------------
export const selectGithubIssueById = createSelector(
  selectGithubIssueFeatureState,
  (state, props: { id: number }) => state.entities[props.id]
);

// REDUCER
// -------
export const initialGithubIssueState: GithubIssueState = githubIssueAdapter.getInitialState({
  stateBefore: null
});

export function githubIssueReducer(
  state: GithubIssueState = initialGithubIssueState,
  action: GithubIssueActions | TaskActions
): GithubIssueState {

  switch (action.type) {
    // Meta Actions
    // ------------
    case GithubIssueActionTypes.LoadState: {
      return Object.assign({}, action.payload.state);
    }

    case TaskActionTypes.UndoDeleteTask: {
      return state.stateBefore || state;
    }

    case TaskActionTypes.AddTask: {
      if (action.payload.issue && action.payload.task.issueType === GITHUB_TYPE) {
        const issue = action.payload.issue as GithubIssue;
        return githubIssueAdapter.upsertOne(issue, state);
      }
      return state;
    }

    case TaskActionTypes.DeleteTask: {
      if (action.payload.task.issueType === GITHUB_TYPE) {
        const issue = action.payload.task.issueData as GithubIssue;
        const ids = state.ids as number[];
        if (issue && issue.id && ids.includes(+issue.id)) {
          return githubIssueAdapter.removeOne(issue.id, {
            ...state,
            stateBefore: {...state, stateBefore: null}
          });
        } else {
          // don't crash app but warn strongly
          console.log('##########################################################');
          console.warn(' THIS SHOULD NOT HAPPEN: Github IssueData could not be found', issue, action, state);
          console.log('##########################################################');
          return state;
        }
        // TODO sub task case if we need it in the future
      }
      return state;
    }

    case TaskActionTypes.MoveToArchive: {
      const tasksWithGithubIssue = action.payload.tasks.filter(task => task.issueType === GITHUB_TYPE);

      if (tasksWithGithubIssue && tasksWithGithubIssue.length > 0) {
        const issueIds = tasksWithGithubIssue.map(task => task.issueId)
        // only remove if data is there in the first place
          .filter((issueId) => {
            const ids = state.ids as number[];
            const isInState = ids.includes(+issueId);
            if (!isInState) {
              // don't crash app but warn strongly
              console.log('##########################################################');
              console.warn(' THIS SHOULD NOT HAPPEN: Github Issue could not be found', issueId, action, state);
              console.log('##########################################################');
            }
            return isInState;
          });
        return issueIds.length
          ? githubIssueAdapter.removeMany(issueIds, state)
          : state;
      }

      return state;
    }

    case TaskActionTypes.RestoreTask: {
      if (action.payload.task.issueType === GITHUB_TYPE) {
        const issue = action.payload.task.issueData as GithubIssue;
        return githubIssueAdapter.upsertOne(issue, state);
        // TODO sub task case if we need it in the future
      }
      return state;
    }


    // GithubIssue Actions
    // ------------
    case GithubIssueActionTypes.UpsertGithubIssue: {
      return githubIssueAdapter.upsertOne(action.payload.githubIssue, state);
    }

    case GithubIssueActionTypes.AddGithubIssue: {
      return githubIssueAdapter.addOne(action.payload.githubIssue, state);
    }

    case GithubIssueActionTypes.AddGithubIssues: {
      return githubIssueAdapter.addMany(action.payload.githubIssues, state);
    }

    case GithubIssueActionTypes.UpdateGithubIssue: {
      return githubIssueAdapter.updateOne(action.payload.githubIssue, state);
    }

    case GithubIssueActionTypes.UpdateGithubIssues: {
      return githubIssueAdapter.updateMany(action.payload.githubIssues, state);
    }

    case GithubIssueActionTypes.DeleteGithubIssue: {
      return githubIssueAdapter.removeOne(action.payload.id, state);
    }

    case GithubIssueActionTypes.DeleteGithubIssues: {
      return githubIssueAdapter.removeMany(action.payload.ids, state);
    }

    case GithubIssueActionTypes.LoadGithubIssues: {
      return githubIssueAdapter.addAll(action.payload.githubIssues, state);
    }

    case GithubIssueActionTypes.ClearGithubIssues: {
      return githubIssueAdapter.removeAll(state);
    }

    default: {
      return state;
    }
  }
}
