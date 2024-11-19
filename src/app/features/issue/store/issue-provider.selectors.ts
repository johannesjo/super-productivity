import { createFeatureSelector } from '@ngrx/store';
import { ISSUE_PROVIDER_FEATURE_KEY } from './issue-provider.reducer';
import { IssueProviderState } from '../issue.model';

export const selectIssueProviderState = createFeatureSelector<IssueProviderState>(
  ISSUE_PROVIDER_FEATURE_KEY,
);
