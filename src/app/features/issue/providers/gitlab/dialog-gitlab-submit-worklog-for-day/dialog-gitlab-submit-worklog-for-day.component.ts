import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { T } from 'src/app/t.const';
import { MatDialogRef } from '@angular/material/dialog';
import { TaskService } from '../../../../tasks/task.service';
import { DateService } from '../../../../../core/date/date.service';
import { Task } from '../../../../tasks/task.model';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectAllTasks } from '../../../../tasks/store/task.selectors';
import { GitlabApiService } from '../gitlab-api/gitlab-api.service';

@Component({
  selector: 'dialog-gitlab-submit-worklog-for-day',
  templateUrl: './dialog-gitlab-submit-worklog-for-day.component.html',
  styleUrls: ['./dialog-gitlab-submit-worklog-for-day.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogGitlabSubmitWorklogForDayComponent {
  T: typeof T = T;

  gitlabTasks$: Observable<Task[]> = this._store.select(selectAllTasks);
  day: string = this._dateService.todayStr();

  constructor(
    private _matDialogRef: MatDialogRef<DialogGitlabSubmitWorklogForDayComponent>,
    private _taskService: TaskService,
    private _dateService: DateService,
    private _store: Store,
    private _gitlabApiService: GitlabApiService,
  ) {}

  updateTimeSpentTodayForTask(task: Task, newVal: number | string): void {
    this._taskService.updateEverywhere(task.id, {
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
}
