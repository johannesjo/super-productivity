import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitlabIssueHeaderComponent } from './gitlab-issue-header/gitlab-issue-header.component';
import { GitlabIssueContentComponent } from './gitlab-issue-content/gitlab-issue-content.component';
import { UiModule } from 'src/app/ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EffectsModule } from '@ngrx/effects';
import { GitlabIssueEffects } from './gitlab-issue.effects';
import { BeforeFinishDayService } from '../../../../before-finish-day/before-finish-day.service';
import { first } from 'rxjs/operators';
import { GITLAB_TYPE } from '../../../issue.const';
import { MatDialog } from '@angular/material/dialog';
import { TaskCopy } from '../../../../tasks/task.model';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { DialogGitlabSubmitWorklogForDayComponent } from '../dialog-gitlab-submit-worklog-for-day/dialog-gitlab-submit-worklog-for-day.component';
import { ProjectService } from '../../../../project/project.service';

@NgModule({
  declarations: [GitlabIssueHeaderComponent, GitlabIssueContentComponent],
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    EffectsModule.forFeature([GitlabIssueEffects]),
  ],
  exports: [GitlabIssueHeaderComponent, GitlabIssueContentComponent],
})
export class GitlabIssueModule {
  constructor(
    private readonly _beforeFinishDayService: BeforeFinishDayService,
    private readonly _workContextService: WorkContextService,
    private readonly _matDialog: MatDialog,
    private readonly _projectService: ProjectService,
  ) {
    this._beforeFinishDayService.addAction(async () => {
      const tasksForCurrentList =
        await this._workContextService.allTasksForCurrentContext$
          .pipe(first())
          .toPromise();
      const gitlabTasks = tasksForCurrentList.filter((t) => t.issueType === GITLAB_TYPE);
      if (gitlabTasks.length > 0) {
        // sort gitlab tasks by project
        const gitlabTasksByProjectId: { [key: string]: TaskCopy[] } = gitlabTasks.reduce(
          (acc, task) => {
            if (typeof task.projectId === 'string') {
              acc[task.projectId] = acc[task.projectId] || [];
              acc[task.projectId].push(task);
            }
            return acc;
          },
          {} as { [key: string]: TaskCopy[] },
        );
        await Promise.all(
          Object.keys(gitlabTasksByProjectId).map(async (projectId) => {
            const tasksForProject = gitlabTasksByProjectId[projectId];
            const gitlabCfgForProject = await this._projectService
              .getGitlabCfgForProject$(projectId)
              .pipe(first())
              .toPromise();
            if (
              gitlabCfgForProject &&
              gitlabCfgForProject.isEnabled &&
              gitlabCfgForProject.isEnableTimeTracking
            ) {
              await this._matDialog
                .open(DialogGitlabSubmitWorklogForDayComponent, {
                  restoreFocus: true,
                  data: {
                    cfg: gitlabCfgForProject,
                    projectId,
                    tasksForProject,
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
