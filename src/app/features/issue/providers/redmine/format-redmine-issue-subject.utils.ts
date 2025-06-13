import { RedmineIssue } from './redmine-issue.model';
import { truncate } from '../../../../util/truncate';

export const formatRedmineIssueSubject = ({ id, subject }: RedmineIssue): string => {
  return `#${id} ${subject}`;
};

export const formatRedmineIssueSubjectForSnack = (issue: RedmineIssue): string => {
  return `${truncate(formatRedmineIssueSubject(issue))}`;
};
