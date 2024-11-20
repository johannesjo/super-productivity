import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  ISSUE_PROVIDER_FEATURE_KEY,
  issueProvidersFeature,
} from './issue-provider.reducer';
import { IssueProvider, IssueProviderKey, IssueProviderState } from '../issue.model';

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

export const selectIssueProviderById = <T extends IssueProvider>(
  id: string,
  issueProviderKey: IssueProviderKey | null,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
  createSelector(selectIssueProviderState, ({ entities }) => {
    const issueProvider = entities[id];
    if (!issueProvider) {
      throw new Error(`No issueProvider found for id ${id}`);
    }
    if (issueProviderKey && issueProvider.issueProviderKey !== issueProviderKey) {
      console.log(issueProviderKey, issueProvider);
      throw new Error(
        `IssueProvider found for id ${id} is not of type ${issueProviderKey} but ${issueProvider.issueProviderKey}`,
      );
    }

    return issueProvider as T;
  });
