import {Injectable} from '@angular/core';
import {combineLatest, forkJoin, from, Observable} from 'rxjs';
import {map, shareReplay, switchMap, tap} from 'rxjs/operators';
import {TaskService} from './task.service';
import {ReminderService} from '../reminder/reminder.service';
import {ProjectService} from '../project/project.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduledTaskService {
  // TODO think about adding tasks here as well as trigger
  allScheduledTasks$: Observable<any> = this._reminderService.reminders$.pipe(
    tap(() => console.time('timme')),
    map((reminders) => reminders
      .filter(reminder => reminder.type === 'TASK')
    ),
    switchMap((reminders) => forkJoin(reminders.map(reminder =>
        from(this._reminderService._getRelatedDataForReminder(reminder.relatedId, reminder.projectId, reminder.type)).pipe(
          map((task) => {
            return {
              ...task,
              reminderData: this._reminderService.getById(task.reminderId),
            };
          }),
        )
      )),
    ),
    map(tasks => tasks.sort((a, b) => a.reminderData.remindAt - b.reminderData.remindAt)),
    tap(() => console.timeEnd('timme')),
    shareReplay(),
  );

  scheduledTasksForOtherProjects$: Observable<any> = combineLatest(
    this._projectService.currentId$,
    this.allScheduledTasks$,
  ).pipe(
    map(([currentProjectId, tasks]) => tasks.filter(task => task.reminderData.projectId !== currentProjectId))
  );

  scheduledTasksForCurrentProject$: Observable<any> = combineLatest(
    this._projectService.currentId$,
    this.allScheduledTasks$,
  ).pipe(
    map(([currentProjectId, tasks]) => tasks.filter(task => task.reminderData.projectId === currentProjectId))
  );

  constructor(
    private _taskService: TaskService,
    private _reminderService: ReminderService,
    private _projectService: ProjectService,
  ) {
  }
}
