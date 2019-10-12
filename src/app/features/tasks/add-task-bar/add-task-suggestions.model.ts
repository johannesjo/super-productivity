import {IssueData, IssueProviderKey} from '../../issue/issue';

export interface AddTaskSuggestion {
  title: string;

  // all issue types
  issueType?: IssueProviderKey;
  issueData?: IssueData;

  // jira only
  titleHighlighted?: string;

  // task only
  taskId?: string;
  taskIssueId?: string;
}
