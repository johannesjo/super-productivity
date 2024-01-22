import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';
import { TimelineFromCalendarEvent } from '../timeline.model';
import { TaskService } from '../../tasks/task.service';
import { Store } from '@ngrx/store';

@Component({
  selector: 'timeline-calendar-event',
  templateUrl: './timeline-calendar-event.component.html',
  styleUrls: ['./timeline-calendar-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineCalendarEventComponent {
  @Input() calendarEvent?: TimelineFromCalendarEvent;

  @HostListener('click', ['$event'])
  async onClick(): Promise<void> {
    if (this.calendarEvent) {
      this._taskService.addAndSchedule(
        this.calendarEvent.title,
        {
          projectId: null,
          issueId: this.calendarEvent.id,
          issueType: 'CALENDAR',
          timeEstimate: this.calendarEvent.duration,
        },
        this.calendarEvent.start,
      );
    }
  }

  constructor(private _taskService: TaskService, private _store: Store) {}
}
