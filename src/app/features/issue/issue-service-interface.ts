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
  // MANDATORY
  // ---------
  isEnabled(cfg: IssueIntegrationCfg): boolean;

  testConnection$(cfg: IssueIntegrationCfg): Observable<boolean>;

  pollTimer$: Observable<number>;

  issueLink$(issueId: string | number, issueProviderId: string): Observable<string>;

  getById$(id: string | number, issueProviderId: string): Observable<IssueData | null>;

  getAddTaskData(issueData: IssueDataReduced): Partial<Task> & { title: string };

  searchIssues$(
    searchTerm: string,
    issueProviderId: string,
  ): Observable<SearchResultItem[]>;

  // also used to determine if task is done
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

  // OPTIONAL
  // --------
  getMappedAttachments?(issueData: IssueData): TaskAttachment[];

  getNewIssuesToAddToBacklog?(
    issueProviderId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<IssueDataReduced[]>;
}
