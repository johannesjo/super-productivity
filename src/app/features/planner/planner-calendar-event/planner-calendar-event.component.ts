import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  Input,
} from '@angular/core';
import { TimelineFromCalendarEvent } from '../../timeline/timeline.model';
import { selectCalendarProviderById } from '../../config/store/global-config.reducer';
import { first } from 'rxjs/operators';
import { TaskService } from '../../tasks/task.service';
import { Store } from '@ngrx/store';

@Component({
  selector: 'planner-calendar-event',
  templateUrl: './planner-calendar-event.component.html',
  styleUrl: './planner-calendar-event.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerCalendarEventComponent {
  @Input() calendarEvent?: TimelineFromCalendarEvent;

  @HostBinding('attr.title') title = `Convert to task`;

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
