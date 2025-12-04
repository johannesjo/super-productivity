import { LinearIssueReduced } from './linear-issue.model';

export const mapLinearIssueToSearchResult = (
  issue: LinearIssueReduced,
): { title: string } => ({
  title: `${issue.identifier} ${issue.title}`,
});

export const isLinearIssueDone = (issue: LinearIssueReduced): boolean =>
  issue.state.type === 'completed' || issue.state.type === 'canceled';
