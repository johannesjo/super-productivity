import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable, of } from 'rxjs';
import { Task, TaskCopy } from '../../../tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import {
  IssueData,
  IssueDataReduced,
  IssueProviderCalendar,
  SearchResultItem,
} from '../../issue.model';
import { CalendarIntegrationService } from '../../../calendar-integration/calendar-integration.service';
import { catchError, map, switchMap } from 'rxjs/operators';
import { IssueProviderService } from '../../issue-provider.service';
import { CalendarIssueReduced, CalendarProviderCfg } from './calendar.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class CalendarCommonInterfacesService implements IssueServiceInterface {
  private _calendarIntegrationService = inject(CalendarIntegrationService);
  private _issueProviderService = inject(IssueProviderService);
  private _http = inject(HttpClient);

  isEnabled(cfg: IssueProviderCalendar): boolean {
    return cfg.isEnabled && cfg.icalUrl?.length > 0;
  }

  // We currently don't support polling for calendar events
  pollTimer$: Observable<number> = EMPTY;

  issueLink$(issueId: number, issueProviderId: string): Observable<string> {
    return of('NONE');
  }

  testConnection$(cfg: CalendarProviderCfg): Observable<boolean> {
    //  simple http get request
    return this._http.get(cfg.icalUrl, { responseType: 'text' }).pipe(
      map((v) => !!v),
      catchError((err) => {
        console.error(err);
        return of(false);
      }),
    );
  }

  getById$(id: number, issueProviderId: string): Observable<IssueData> {
    return of({} as any);
  }

  getAddTaskData(
    calEv: CalendarIssueReduced,
  ): Partial<Readonly<TaskCopy>> & { title: string } {
    return {
      title: calEv.title,
      issueId: calEv.id,
      issueProviderId: calEv.calProviderId,
      issueType: 'CALENDAR',
      timeEstimate: calEv.duration,
      notes: calEv.description || '',
      issueWasUpdated: false,
      issueLastUpdated: new Date().getTime(),
      // projectId: getCalProvider?.defaultProjectId || null,
    };
  }

  searchIssues$(query: string, issueProviderId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(issueProviderId).pipe(
      switchMap((cfg) => this._calendarIntegrationService.requestEventsForSchedule$(cfg)),
      map((calEvents) =>
        calEvents
          .filter((calEvent) =>
            calEvent.title.toLowerCase().includes(query.toLowerCase()),
          )
          .map((calEvent) => ({
            title: calEvent.title,
            issueType: 'CALENDAR',
            issueData: calEvent,
          })),
      ),
    );
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

  private _getCfgOnce$(issueProviderId: string): Observable<IssueProviderCalendar> {
    return this._issueProviderService.getCfgOnce$(issueProviderId, 'CALENDAR');
  }
}
