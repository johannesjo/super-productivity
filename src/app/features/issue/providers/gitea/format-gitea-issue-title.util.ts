import { GiteaIssue } from './gitea-issue/gitea-issue.model';
import { truncate } from '../../../../util/truncate';

export const formatGiteaIssueTitle = ({ id, title }: GiteaIssue): string => {
  return `#${id} ${title}`;
};

export const formatGiteaIssueTitleForSnack = (issue: GiteaIssue): string => {
  return `${truncate(formatGiteaIssueTitle(issue))}`;
};
