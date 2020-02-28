import {Observable} from 'rxjs';
import {IssueData, IssueProviderKey, SearchResultItem} from './issue';
import {Task} from '../tasks/task.model';
import {Attachment} from '../attachment/attachment.model';

export interface IssueServiceInterface {
  searchIssues$?(searchTerm: string): Observable<SearchResultItem[]>;

  refreshIssue?(task: Task, isNotifySuccess: boolean, isNotifyNoUpdateRequired: boolean);

  // addTaskWithIssue(issueData: IssueData, isAddToBacklog: boolean): Promise<any>;
  getAddTaskData?(issueId: string | number): Promise<{ title: string; additionalFields: Partial<Task> }>;

  getMappedAttachments?(issueDataIN: IssueData): Attachment[];

  issueLink?(issueId: string | number): string;
}
