import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  ISSUE_PROVIDER_FEATURE_KEY,
  issueProvidersFeature,
} from './issue-provider.reducer';
import { IssueProvider, IssueProviderState } from '../issue.model';

export const selectIssueProviderState = createFeatureSelector<IssueProviderState>(
  ISSUE_PROVIDER_FEATURE_KEY,
);

export const { selectIds, selectEntities, selectAll, selectTotal } =
  issueProvidersFeature;

export const selectEnabledIssueProviders = createSelector(
  selectAll,

  (issueProviders: IssueProvider[]): IssueProvider[] =>
    issueProviders.filter(
      // TODO fix type
      (issueProvider: IssueProvider) => (issueProvider as any).isEnabled,
    ),
);
