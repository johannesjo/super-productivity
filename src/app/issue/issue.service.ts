import { Injectable } from '@angular/core';
import { JiraIssueService } from './jira/jira-issue/jira-issue.service';
import { combineLatest } from 'rxjs';
import { Observable } from 'rxjs';
import { IssueEntityMap } from './issue';

@Injectable({
  providedIn: 'root'
})
export class IssueService {
  public issueEntityMap$: Observable<IssueEntityMap> = combineLatest(
    this._jiraIssueService.jiraIssuesEntities$
  ).map(([jiraEntities]) => {
    return {
      JIRA: jiraEntities
    };
  });

  constructor(private _jiraIssueService: JiraIssueService) {
    this.issueEntityMap$.subscribe((v) => console.log(v));
  }
}
