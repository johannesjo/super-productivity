import { Observable } from 'rxjs';
import {
  IssueData,
  IssueDataReduced,
  IssueIntegrationCfg,
  SearchResultItem,
} from './issue.model';
import { Task } from '../tasks/task.model';
import { TaskAttachment } from '../tasks/task-attachment/task-attachment.model';

export interface IssueServiceInterface {
  isEnabled(cfg: IssueIntegrationCfg): boolean;

  isBacklogPollingEnabledForProjectOnce$(projectId: string): Observable<boolean>;

  // isIssueRefreshEnabledForProject$(projectId: string): Observable<boolean>;

  pollTimer$: Observable<number>;

  issueLink$(issueId: string | number, projectId: string): Observable<string>;

  getById$(id: string | number, projectId: string): Observable<IssueData>;

  getAddTaskData(issueData: IssueDataReduced): Partial<Task> & { title: string };

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]>;

  getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: IssueData;
    issueTitle: string;
  } | null>;

  getFreshDataForIssueTasks(tasks: Task[]): Promise<
    {
      task: Task;
      taskChanges: Partial<Task>;
      issue: IssueData;
    }[]
  >;

  // OPTIONAL INTERFACES
  // -------------------
  getMappedAttachments?(issueData: IssueData): TaskAttachment[];

  getNewIssuesToAddToBacklog?(
    projectId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<IssueDataReduced[]>;
}
