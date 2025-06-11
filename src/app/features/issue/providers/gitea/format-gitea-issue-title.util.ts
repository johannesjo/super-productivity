import { GiteaIssue } from './gitea-issue.model';
import { truncate } from '../../../../util/truncate';

export const formatGiteaIssueTitle = ({ number, title }: GiteaIssue): string => {
  return `#${number} ${title}`;
};

export const formatGiteaIssueTitleForSnack = (issue: GiteaIssue): string => {
  return `${truncate(formatGiteaIssueTitle(issue))}`;
};
