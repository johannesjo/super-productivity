import { AzuredevopsIssue, AzuredevopsIssueReduced } from './azuredevops-issue.model';
import { AzuredevopsWorkItem } from '../azuredevops-api-responses';
import { IssueProviderKey, SearchResultItem } from '../../../issue.model';

export const mapAzuredevopsIssue = (issue: AzuredevopsWorkItem): AzuredevopsIssue => {
  return {
    id: issue.id,
    url: issue.url,
    number: issue.id,
    state: issue.fields['System.State'],
    title: issue.fields['System.Title'],
    body: issue.fields['System.Description'],
    created_at: issue.fields['System.CreatedDate'],
    updated_at: issue.fields['System.ChangedDate'],
    type: issue.fields['System.WorkItemType'],
  };
};

export const mapAzuredevopsWIQLSearchResult = (res: any): AzuredevopsIssueReduced[] => {
  return res.data.workItems.map(mapAzuredevopsReducedIssueFromWIQL);
};

export const mapAzuredevopsReducedIssueFromWIQL = (
  workItem: any,
): AzuredevopsIssueReduced => {
  console.log(workItem);
  return {
    id: workItem.id,
    url: workItem.url,
    title: workItem.fields['System.Title'],
    state: workItem.fields['System.State'],
    updated_at: workItem.fields['System.ChangedDate'],
  };
};

export const mapAzuredevopsIssueToSearchResult = (
  issue: AzuredevopsIssue,
): SearchResultItem => {
  return {
    title: '#' + issue.number + ' ' + issue.title,
    issueType: 'AZUREDEVOPS' as IssueProviderKey,
    issueData: issue,
  };
};
