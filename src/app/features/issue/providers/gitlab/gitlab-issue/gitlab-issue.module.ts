import { inject, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitlabIssueHeaderComponent } from './gitlab-issue-header/gitlab-issue-header.component';
import { GitlabIssueContentComponent } from './gitlab-issue-content/gitlab-issue-content.component';
import { UiModule } from 'src/app/ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BeforeFinishDayService } from '../../../../before-finish-day/before-finish-day.service';
import { first } from 'rxjs/operators';
import { GITLAB_TYPE } from '../../../issue.const';
import { MatDialog } from '@angular/material/dialog';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { TaskCopy } from '../../../../tasks/task.model';
import { DialogGitlabSubmitWorklogForDayComponent } from '../dialog-gitlab-submit-worklog-for-day/dialog-gitlab-submit-worklog-for-day.component';
import { IssueProviderService } from '../../../issue-provider.service';

@NgModule({
  declarations: [GitlabIssueHeaderComponent, GitlabIssueContentComponent],
  imports: [CommonModule, UiModule, FormsModule, ReactiveFormsModule],
  exports: [GitlabIssueHeaderComponent, GitlabIssueContentComponent],
})
export class GitlabIssueModule {
  private readonly _beforeFinishDayService = inject(BeforeFinishDayService);
  private readonly _workContextService = inject(WorkContextService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _issueProviderService = inject(IssueProviderService);

  constructor() {
    this._beforeFinishDayService.addAction(async () => {
      const tasksForCurrentList =
        await this._workContextService.allTasksForCurrentContext$
          .pipe(first())
          .toPromise();
      const gitlabTasks = tasksForCurrentList.filter((t) => t.issueType === GITLAB_TYPE);
      if (gitlabTasks.length > 0) {
        // sort gitlab tasks by issueProviderId
        const gitlabTasksByIssueProviderId: { [key: string]: TaskCopy[] } =
          gitlabTasks.reduce(
            (acc, task) => {
              if (typeof task.issueProviderId === 'string') {
                acc[task.issueProviderId] = acc[task.issueProviderId] || [];
                acc[task.issueProviderId].push(task);
              }
              return acc;
            },
            {} as { [key: string]: TaskCopy[] },
          );
        await Promise.all(
          Object.keys(gitlabTasksByIssueProviderId).map(async (issueProviderId) => {
            const tasksForIssueProvider = gitlabTasksByIssueProviderId[issueProviderId];
            const gitlabCfgForProvider = await this._issueProviderService
              .getCfgOnce$(issueProviderId, 'GITLAB')
              .pipe(first())
              .toPromise();
            if (
              gitlabCfgForProvider &&
              gitlabCfgForProvider.isEnabled &&
              gitlabCfgForProvider.isEnableTimeTracking
            ) {
              await this._matDialog
                .open(DialogGitlabSubmitWorklogForDayComponent, {
                  restoreFocus: true,
                  disableClose: true,
                  closeOnNavigation: false,
                  data: {
                    gitlabCfg: gitlabCfgForProvider,
                    issueProviderId,
                    tasksForIssueProvider,
                  },
                })
                .afterClosed()
                .toPromise();
            }
          }),
        );
      }

      return 'SUCCESS';
    });
  }
}
