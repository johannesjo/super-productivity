import {Injectable} from '@angular/core';
import {combineLatest, from, Observable} from 'rxjs';
import {delay, map, shareReplay, switchMap} from 'rxjs/operators';
import {TaskService} from './task.service';
import {ReminderService} from '../reminder/reminder.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduledTaskService {
  allScheduledTasks$: Observable<any> = combineLatest([
    this._reminderService.reminders$,
    this._taskService.scheduledTasksWOData$,
  ]).pipe(
    // because we read the tasks from th database rather than from the store
    // we need to wait a little bit :/
    // TODO better solution
    delay(100),
    map(([reminders]) => reminders
      .filter(reminder => reminder.type === 'TASK')
    ),
    switchMap((reminders) => {
        const projectIdTaskMap = reminders.reduce((acc, reminder) => {
          const taskArr = acc[reminder.projectId] || [];
          return {
            ...acc,
            [reminder.projectId]: [...taskArr, reminder.relatedId],
          };
        }, {});
        return from(this._taskService.getByIdsFromAllProjects(projectIdTaskMap)).pipe(
          map((tasks) => tasks.map(task => {
              return {
                ...task,
                reminderData: reminders.find(reminder => reminder.relatedId === task.id)
              };
            }),
          ));
      },
    ),
    map(tasks => tasks
      .sort((a, b) => a.reminderData.remindAt - b.reminderData.remindAt)),
    shareReplay(1),
  );


  constructor(
    private _taskService: TaskService,
    private _reminderService: ReminderService,
  ) {
    // this.allScheduledTasks$.subscribe((v) => console.log('allScheduledTasks$', v));
    // this.scheduledTasksForCurrentProject$.subscribe((v) => console.log('scheduledTasksForCurrentProject$', v));
  }
}
