import { IssueProvider } from './issue.model';

export const getIssueProviderTooltip = (issueProvider: IssueProvider): string => {
  switch (issueProvider.issueProviderKey) {
    case 'JIRA':
      return issueProvider.host as string;
    case 'GITHUB':
      return issueProvider.repo as string;
  }
  return issueProvider.issueProviderKey;
};
