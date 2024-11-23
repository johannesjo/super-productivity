import { SearchResultItem } from '../issue.model';

const ISSUE_DONE_STATE_NAME_GUESSES = ['closed', 'done', 'completed', 'resolved'];

export const isIssueDone = (searchResultItem: SearchResultItem): boolean => {
  switch (searchResultItem.issueType) {
    case 'GITHUB':
      return (
        (searchResultItem as SearchResultItem<'GITHUB'>).issueData.state === 'closed'
      );

    case 'GITLAB':
      return (
        (searchResultItem as SearchResultItem<'GITLAB'>).issueData.state === 'closed'
      );

    case 'GITEA':
      return ISSUE_DONE_STATE_NAME_GUESSES.includes(
        (searchResultItem as SearchResultItem<'GITEA'>).issueData.state,
      );

    case 'JIRA':
      return ISSUE_DONE_STATE_NAME_GUESSES.includes(
        (searchResultItem as SearchResultItem<'JIRA'>).issueData.status?.name,
      );

    case 'REDMINE':
      return ISSUE_DONE_STATE_NAME_GUESSES.includes(
        (searchResultItem as SearchResultItem<'REDMINE'>).issueData.status?.name,
      );

    case 'OPEN_PROJECT':
      return false;

    case 'CALDAV':
      return false;

    default:
      return false;
  }
};
