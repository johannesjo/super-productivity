import { IssueProvider, IssueProviderState } from './issue.model';
import { isMigrateModel } from '../../util/is-migrate-model';
import { MODEL_VERSION } from '../../core/model-version';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { Dictionary } from '@ngrx/entity';

export const migrateIssueProviderState = (
  issueProviderState: IssueProviderState,
): IssueProviderState => {
  if (
    !isMigrateModel(issueProviderState, MODEL_VERSION.ISSUE_PROVIDER, 'IssueProvider')
  ) {
    return issueProviderState;
  }

  const issueProviderEntities: Dictionary<IssueProvider> = {
    ...issueProviderState.entities,
  };
  Object.keys(issueProviderEntities).forEach((key) => {
    issueProviderEntities[key] = _updateIssueProviderKeyToICAL(
      issueProviderEntities[key] as IssueProvider,
    );
  });

  return {
    ...issueProviderState,
    entities: issueProviderEntities,
    // Update model version after all migrations ran successfully
    [MODEL_VERSION_KEY]: MODEL_VERSION.ISSUE_PROVIDER,
  };
};

const _updateIssueProviderKeyToICAL = (issueProvider: IssueProvider): IssueProvider => {
  return issueProvider.issueProviderKey === ('CALENDAR' as any)
    ? ({ ...issueProvider, issueProviderKey: 'ICAL' } as IssueProvider)
    : issueProvider;
};
