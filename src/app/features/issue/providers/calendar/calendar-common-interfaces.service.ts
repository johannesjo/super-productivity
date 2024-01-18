import { Injectable } from '@angular/core';
import { EMPTY, Observable, of } from 'rxjs';
import { Task, TaskCopy } from '../../../tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import { IssueData, IssueDataReduced, SearchResultItem } from '../../issue.model';
import { ProjectService } from '../../../project/project.service';

@Injectable({
  providedIn: 'root',
})
export class CalendarCommonInterfacesService implements IssueServiceInterface {
  constructor(private readonly _projectService: ProjectService) {}

  isEnabled(cfg: any): boolean {
    return true;
  }

  isBacklogPollingEnabledForProjectOnce$(projectId: string): Observable<boolean> {
    return of(false);
  }

  isIssueRefreshEnabledForProjectOnce$(projectId: string): Observable<boolean> {
    return of(false);
  }

  pollTimer$: Observable<number> = EMPTY;

  issueLink$(issueId: number, projectId: string): Observable<string> {
    return of('NONE');
  }

  getById$(id: number, projectId: string): Observable<IssueData> {
    return of({} as any);
  }

  getAddTaskData(issue: any): Partial<Readonly<TaskCopy>> & { title: string } {
    return {
      title: 'XXX',
      issueWasUpdated: false,
      issueLastUpdated: new Date().getTime(),
    };
  }

  searchIssues$(query: string, projectId: string): Observable<SearchResultItem[]> {
    return of([]);
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: any;
    issueTitle: string;
  } | null> {
    return null;
  }

  async getFreshDataForIssueTasks(tasks: Task[]): Promise<
    {
      task: Readonly<Task>;
      taskChanges: Partial<Readonly<Task>>;
      issue: any;
    }[]
  > {
    return [];
  }

  async getNewIssuesToAddToBacklog(
    projectId: string,
    allExistingIssueIds: number[],
  ): Promise<IssueDataReduced[]> {
    return [];
  }
}
