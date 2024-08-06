import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { Store } from '@ngrx/store';
import { selectCalendarProviderById } from '../../config/store/global-config.reducer';
import { first } from 'rxjs/operators';
import { ScheduleFromCalendarEvent } from '../../schedule/schedule.model';

@Component({
  selector: 'timeline-calendar-event',
  templateUrl: './timeline-calendar-event.component.html',
  styleUrls: ['./timeline-calendar-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineCalendarEventComponent {
  @Input() calendarEvent?: ScheduleFromCalendarEvent;

  @HostListener('click', ['$event'])
  async onClick(): Promise<void> {
    if (this.calendarEvent) {
      const getCalProvider = this.calendarEvent.calProviderId
        ? await this._store
            .select(selectCalendarProviderById, { id: this.calendarEvent.calProviderId })
            .pipe(first())
            .toPromise()
        : undefined;

      this._taskService.addAndSchedule(
        this.calendarEvent.title,
        {
          projectId: getCalProvider?.defaultProjectId || null,
          issueId: this.calendarEvent.id,
          issueProviderId: this.calendarEvent.calProviderId,
          issueType: 'CALENDAR',
          timeEstimate: this.calendarEvent.duration,
        },
        this.calendarEvent.start,
      );
    }
  }

  constructor(
    private _taskService: TaskService,
    private _store: Store,
  ) {}
}
