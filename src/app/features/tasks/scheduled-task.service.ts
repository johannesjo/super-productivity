import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map, shareReplay, switchMap} from 'rxjs/operators';
import {TaskService} from './task.service';
import {ReminderService} from '../reminder/reminder.service';
import {TaskWithReminderData} from './task.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduledTaskService {
  allScheduledTasks$: Observable<TaskWithReminderData[]> = this._reminderService.reminders$.pipe(
    map((reminders) => reminders.filter(
      reminder => reminder.type === 'TASK'
    )),
    switchMap((reminders) => {
      const ids = reminders.map(r => r.relatedId);
      return this._taskService.getByIdsLive$(ids).pipe(
        map((tasks) => tasks.map(
          task => ({
            ...task,
            reminderData: reminders.find(reminder => reminder.relatedId === task.id)
          })),
        ),
      );
    }),
    map(tasks => tasks
      .sort((a, b) => a.reminderData.remindAt - b.reminderData.remindAt)),
    shareReplay(1),
  );


  constructor(
    private _taskService: TaskService,
    private _reminderService: ReminderService,
  ) {
  }
}
