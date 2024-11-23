import { Injectable } from '@angular/core';
import { EMPTY, Observable, of } from 'rxjs';
import { Task, TaskCopy } from '../../../tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import { IssueData, IssueDataReduced, SearchResultItem } from '../../issue.model';
import { CaldavCfg } from '../caldav/caldav.model';

@Injectable({
  providedIn: 'root',
})
export class CalendarCommonInterfacesService implements IssueServiceInterface {
  isEnabled(cfg: any): boolean {
    return true;
  }

  pollTimer$: Observable<number> = EMPTY;

  issueLink$(issueId: number, issueProviderId: string): Observable<string> {
    return of('NONE');
  }

  testConnection$(cfg: CaldavCfg): Observable<boolean> {
    return of(true);
  }

  getById$(id: number, issueProviderId: string): Observable<IssueData> {
    return of({} as any);
  }

  getAddTaskData(issue: any): Partial<Readonly<TaskCopy>> & { title: string } {
    return {
      title: 'XXX',
      issueWasUpdated: false,
      issueLastUpdated: new Date().getTime(),
    };
  }

  searchIssues$(query: string, issueProviderId: string): Observable<SearchResultItem[]> {
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
    issueProviderId: string,
    allExistingIssueIds: number[],
  ): Promise<IssueDataReduced[]> {
    return [];
  }
}
