import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Task, TaskCopy } from '../../../tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import {
  IssueData,
  IssueDataReduced,
  IssueProviderCalendar,
  SearchResultItem,
} from '../../issue.model';
import { CalendarIntegrationService } from '../../../calendar-integration/calendar-integration.service';
import { map, switchMap } from 'rxjs/operators';
import { IssueProviderService } from '../../issue-provider.service';
import { CalendarProviderCfg, ICalIssueReduced } from './calendar.model';
import { HttpClient } from '@angular/common/http';
import { ICAL_TYPE } from '../../issue.const';

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
  pollInterval: number = 0;

  issueLink(issueId: number, issueProviderId: string): Promise<string> {
    return Promise.resolve('NONE');
  }

  testConnection(cfg: CalendarProviderCfg): Promise<boolean> {
    return this._calendarIntegrationService.testConnection(cfg);
  }

  getById(id: number, issueProviderId: string): Promise<IssueData | null> {
    return Promise.resolve(null);
  }

  getAddTaskData(
    calEv: ICalIssueReduced,
  ): Partial<Readonly<TaskCopy>> & { title: string } {
    return {
      title: calEv.title,
      issueId: calEv.id,
      issueProviderId: calEv.calProviderId,
      issueType: 'ICAL',
      timeEstimate: calEv.duration,
      notes: calEv.description || '',
      issueWasUpdated: false,
      issueLastUpdated: new Date().getTime(),
      dueWithTime: calEv.start,
    };
  }

  searchIssues(query: string, issueProviderId: string): Promise<SearchResultItem[]> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(
        switchMap((cfg) =>
          this._calendarIntegrationService.requestEventsForSchedule$(cfg, true),
        ),
        map((calEvents) =>
          calEvents
            .filter((calEvent) =>
              calEvent.title.toLowerCase().includes(query.toLowerCase()),
            )
            .map((calEvent) => ({
              title: calEvent.title,
              issueType: ICAL_TYPE,
              issueData: calEvent,
            })),
        ),
      )
      .toPromise()
      .then((result) => result ?? []);
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: IssueData;
    issueTitle: string;
  } | null> {
    return null;
  }

  async getFreshDataForIssueTasks(tasks: Task[]): Promise<
    {
      task: Readonly<Task>;
      taskChanges: Partial<Readonly<Task>>;
      issue: IssueData;
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
    return this._issueProviderService.getCfgOnce$(issueProviderId, 'ICAL');
  }
}
