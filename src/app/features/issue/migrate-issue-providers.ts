import { IssueProviderState } from './issue.model';

export const migrateIssueProviderState = (
  issueProviderState: IssueProviderState,
): IssueProviderState => {
  return issueProviderState;

  // if (!isMigrateModel(issueProviderState, MODEL_VERSION.PROJECT, 'IssueProvider')) {
  //   return issueProviderState;
  // }
  //
  // const issueProviderEntities: Dictionary<IssueProvider> = { ...issueProviderState.entities };
  // Object.keys(issueProviderEntities).forEach((key) => {
  //   issueProviderEntities[key] = _updateThemeModel(issueProviderEntities[key] as IssueProvider);
  //   issueProviderEntities[key] = _convertToWesternArabicDateKeys(
  //     issueProviderEntities[key] as IssueProvider,
  //   );
  //   issueProviderEntities[key] = _reduceWorkStartEndPrecision(issueProviderEntities[key] as IssueProvider);
  //
  //   // NOTE: absolutely needs to come last as otherwise the previous defaults won't work
  //   issueProviderEntities[key] = _extendIssueProviderDefaults(issueProviderEntities[key] as IssueProvider);
  //   issueProviderEntities[key] = _migrateIsEnabledForIssueProviders(
  //     issueProviderEntities[key] as IssueProvider,
  //   );
  //   issueProviderEntities[key] = _removeOutdatedData(issueProviderEntities[key] as IssueProvider);
  // });
  //
  // return {
  //   ..._fixIds(issueProviderState),
  //   entities: issueProviderEntities,
  //   // Update model version after all migrations ran successfully
  //   [MODEL_VERSION_KEY]: MODEL_VERSION.PROJECT,
  // };
};
