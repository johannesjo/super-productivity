import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { T } from 'src/app/t.const';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DateService } from '../../../../../core/date/date.service';
import { Task } from '../../../../tasks/task.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { GitlabApiService } from '../gitlab-api/gitlab-api.service';
import { ProjectService } from '../../../../project/project.service';
import { first, map } from 'rxjs/operators';
import { msToString } from '../../../../../ui/duration/ms-to-string.pipe';
import { throttle } from 'helpful-decorators';
import { SnackService } from '../../../../../core/snack/snack.service';

@Component({
  selector: 'dialog-gitlab-submit-worklog-for-day',
  templateUrl: './dialog-gitlab-submit-worklog-for-day.component.html',
  styleUrls: ['./dialog-gitlab-submit-worklog-for-day.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogGitlabSubmitWorklogForDayComponent {
  day: string = this._dateService.todayStr();

  private _tmpTasks$: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>(
    this.data.tasksForProject,
  );
  tmpTasks$: Observable<Task[]> = this._tmpTasks$.asObservable();
  tmpTasksToTrack$: Observable<Task[]> = this.tmpTasks$.pipe(
    map((tasks) => tasks.filter((t) => t.timeSpentOnDay[this.day] > 0)),
  );
  project$ = this._projectService.getByIdOnce$(this.data.projectId);

  totalTimeToSubmit$: Observable<number> = this.tmpTasksToTrack$.pipe(
    map((tasks) =>
      tasks.reduce((acc, task) => acc + (task.timeSpentOnDay[this.day] || 0), 0),
    ),
  );
  T: typeof T = T;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: {
      projectId: string;
      tasksForProject: Task[];
    },
    private readonly _matDialogRef: MatDialogRef<DialogGitlabSubmitWorklogForDayComponent>,
    private readonly _dateService: DateService,
    private readonly _projectService: ProjectService,
    private readonly _gitlabApiService: GitlabApiService,
    private readonly _snackService: SnackService,
  ) {
    _matDialogRef.disableClose = true;
  }

  updateTimeSpentTodayForTask(task: Task, newVal: number | string): void {
    this.updateTmpTask(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [this.day]: +newVal,
      },
    });
  }

  // quick way to prevent multiple submits
  @throttle(2000, { leading: true, trailing: false })
  async submit(): Promise<void> {
    try {
      const tasksToTrack = await this.tmpTasksToTrack$.pipe(first()).toPromise();
      const project = await this.project$.pipe(first()).toPromise();
      if (tasksToTrack.length === 0) {
        this._snackService.open({
          type: 'SUCCESS',
          // TODO translate
          msg: 'Gitlab: No time tracking data submitted for project ' + project.title,
        });
        this.close();
        return;
      }

      const gitlabCfg = await this._projectService
        .getGitlabCfgForProject$(this.data.projectId)
        .pipe(first())
        .toPromise();
      if (!gitlabCfg) {
        throw new Error('No gitlab cfg');
      }

      await Promise.all(
        tasksToTrack.map((t) =>
          this._gitlabApiService
            .addTimeSpentToIssue(
              t.issueId as string,
              msToString(t.timeSpentOnDay[this.day]).replace(' ', ''),
              gitlabCfg,
            )
            .pipe(first())
            .toPromise(),
        ),
      );

      this._snackService.open({
        type: 'SUCCESS',
        ico: 'file_upload',
        // TODO translate
        msg: 'Gitlab: Successfully posted time tracking data for project' + project.title,
      });
      this.close();
    } catch (e) {
      console.error(e);
      this._snackService.open({
        type: 'ERROR',
        // TODO translate
        translateParams: {
          errorMsg: 'Error while submitting data to gitlab',
        },
        msg: T.F.OPEN_PROJECT.S.ERR_UNKNOWN,
      });
    }
  }

  close(): void {
    this._matDialogRef.close();
  }

  updateTmpTask(taskId: string, changes: Partial<Task>): void {
    const tasks = this._tmpTasks$.getValue();
    const taskToUpdateIndex = tasks.findIndex((t) => t.id === taskId);
    tasks[taskToUpdateIndex] = {
      ...tasks[taskToUpdateIndex],
      ...changes,
    };
    this._tmpTasks$.next([...tasks]);
  }
}
