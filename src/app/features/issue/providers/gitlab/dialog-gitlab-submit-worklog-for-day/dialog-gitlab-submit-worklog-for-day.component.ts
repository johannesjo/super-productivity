import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
} from '@angular/core';
import { T } from 'src/app/t.const';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TaskService } from '../../../../tasks/task.service';
import { DateService } from '../../../../../core/date/date.service';
import { Task } from '../../../../tasks/task.model';
import { BehaviorSubject, interval, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { GitlabApiService } from '../gitlab-api/gitlab-api.service';
import { GitlabCfg } from '../gitlab';
import { ProjectService } from '../../../../project/project.service';
import { map } from 'rxjs/operators';

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
    public data: { gitlabCfg: GitlabCfg; projectId: string; tasksForProject: Task[] },
    private _matDialogRef: MatDialogRef<DialogGitlabSubmitWorklogForDayComponent>,
    private _taskService: TaskService,
    private _dateService: DateService,
    private _store: Store,
    private _projectService: ProjectService,
    private _gitlabApiService: GitlabApiService,
  ) {
    _matDialogRef.disableClose = true;
    this.totalTimeToSubmit$.subscribe((v) => console.log(`totalTimeToSubmit$`, v));
  }

  updateTimeSpentTodayForTask(task: Task, newVal: number | string): void {
    this.updateTmpTask(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [this.day]: +newVal,
      },
    });
  }

  submit(): void {}

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
