import { Observable } from 'rxjs';
import { IssueData, IssueDataReduced, SearchResultItem } from './issue.model';
import { Task } from '../tasks/task.model';
import { TaskAttachment } from '../tasks/task-attachment/task-attachment.model';

export interface IssueServiceInterface {
  // MANDATORY
  // ---------
  issueLink$(issueId: string | number, projectId: string): Observable<string>;

  getById$(id: string | number, projectId: string): Observable<IssueData>;

  getAddTaskData(issueData: IssueDataReduced): Partial<Task> & { title: string };

  // OPTIONAL
  // --------
  searchIssues$?(searchTerm: string, projectId: string): Observable<SearchResultItem[]>;

  // also used to determine if task is done
  refreshIssue?(
    task: Task,
    isNotifySuccess: boolean,
    isNotifyNoUpdateRequired: boolean,
  ): Promise<{
    taskChanges: Partial<Task>;
    issue: IssueData;
  } | null>;

  refreshIssues?(
    tasks: Task[],
    isNotifySuccess: boolean,
    isNotifyNoUpdateRequired: boolean,
  ): Promise<
    {
      task: Task;
      taskChanges: Partial<Task>;
      issue: IssueData;
    }[]
  >;

  getMappedAttachments?(issueData: IssueData): TaskAttachment[];
}
