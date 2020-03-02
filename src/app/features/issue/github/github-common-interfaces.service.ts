import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {Task} from 'src/app/features/tasks/task.model';
import {catchError, map, switchMap} from 'rxjs/operators';
import {IssueServiceInterface} from '../issue-service-interface';
import {GithubApiService} from './github-api.service';
import {ProjectService} from '../../project/project.service';
import {SearchResultItem} from '../issue.model';
import {GithubCfg} from './github';


@Injectable({
  providedIn: 'root',
})
export class GithubCommonInterfacesService implements IssueServiceInterface {
  isGithubSearchEnabled$: Observable<boolean> = this._projectService.currentGithubCfg$.pipe(
    map(githubCfg => githubCfg && githubCfg.isSearchIssuesFromGithub)
  );
  githubCfg: GithubCfg;

  constructor(
    private readonly _githubApiService: GithubApiService,
    private readonly _projectService: ProjectService,
  ) {
    this._projectService.currentGithubCfg$.subscribe((githubCfg) => this.githubCfg = githubCfg);
  }

  getById$(issueId: number) {
    return this._githubApiService.getById$(issueId);
  }

  searchIssues$(searchTerm: string): Observable<SearchResultItem[]> {
    return this.isGithubSearchEnabled$.pipe(
      switchMap((isSearchGithub) => isSearchGithub
        ? this._githubApiService.searchIssueForRepo$(searchTerm).pipe(catchError(() => []))
        : of([])
      )
    );
  }

  refreshIssue(
    task: Task,
    isNotifySuccess = true,
    isNotifyNoUpdateRequired = false
  ) {
    console.log('NOT IMPLEMENTED YET');

  }

  async getAddTaskData(issueId: number)
    : Promise<{ title: string; additionalFields: Partial<Task> }> {
    const issue = await this._githubApiService.getById$(issueId).toPromise();

    return {
      title: `#${issue.id} ${issue.title}`,
      additionalFields: {
        issueWasUpdated: false,
        issueLastUpdated: new Date(issue.updated_at).getTime()
      }
    };
  }

  issueLink(issueId: number): string {
    return `https://github.com/${this.githubCfg.repo}/issues/${issueId}`;
  }
}
