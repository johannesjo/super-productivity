import { Observable } from 'rxjs';
import { IssueData, IssueDataReduced, SearchResultItem } from './issue.model';
import { Task } from '../tasks/task.model';
import { TaskAttachment } from '../tasks/task-attachment/task-attachment.model';

export interface IssueServiceInterface {
  issueLink$(issueId: string | number, projectId: string): Observable<string>;

  getById$(id: string | number, projectId: string): Observable<IssueData>;

  getAddTaskData(issueData: IssueDataReduced): Partial<Task> & { title: string };

  searchIssues$?(searchTerm: string, projectId: string): Observable<SearchResultItem[]>;

  getFreshDataForIssueTask?(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: IssueData;
    issueTitle: string;
  } | null>;

  getFreshDataForIssueTasks?(
    tasks: Task[],
    /** @deprecated */
    isNotifySuccess: boolean,
    /** @deprecated */
    isNotifyNoUpdateRequired: boolean,
  ): Promise<
    {
      task: Task;
      taskChanges: Partial<Task>;
      issue: IssueData;
    }[]
  >;

  getMappedAttachments?(issueData: IssueData): TaskAttachment[];

  getNewIssuesToAddToBacklog?(
    allExistingIssueIds: number[] | string[],
  ): Promise<IssueData[]>;
}
