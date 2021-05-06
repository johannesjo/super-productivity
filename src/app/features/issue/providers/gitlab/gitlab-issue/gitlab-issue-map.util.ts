import { GitlabIssue } from './gitlab-issue.model';
import { GitlabOriginalIssue } from '../gitlab-api/gitlab-api-responses';
import { IssueProviderKey, SearchResultItem } from '../../../issue.model';

export const mapGitlabIssue = (issue: GitlabOriginalIssue): GitlabIssue => {
  return {
    html_url: issue.web_url,
    // eslint-disable-next-line id-blacklist
    number: issue.iid,
    state: issue.state,
    title: issue.title,
    body: issue.description,
    user: issue.author,
    labels: issue.labels,
    assignee: issue.assignee,
    milestone: issue.milestone as any,
    closed_at: issue.closed_at,
    created_at: issue.created_at,
    updated_at: issue.updated_at,

    // added
    wasUpdated: false,
    commentsNr: issue.user_notes_count,
    _id: issue.id,

    // transformed
    comments: [],
    url: issue.web_url,
    // NOTE: we use the issue number as id as well, as it there is not much to be done with the id with the api
    id: issue.iid,
  };
};

export const mapGitlabIssueToSearchResult = (issue: GitlabIssue): SearchResultItem => {
  return {
    title: '#' + issue.id + ' ' + issue.title,
    issueType: 'GITLAB' as IssueProviderKey,
    issueData: issue,
  };
};
