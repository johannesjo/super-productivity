import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  Input,
} from '@angular/core';
import { selectCalendarProviderById } from '../../config/store/global-config.reducer';
import { first } from 'rxjs/operators';
import { TaskService } from '../../tasks/task.service';
import { Store } from '@ngrx/store';
import { ScheduleFromCalendarEvent } from '../../schedule/schedule.model';

@Component({
  selector: 'planner-calendar-event',
  templateUrl: './planner-calendar-event.component.html',
  styleUrl: './planner-calendar-event.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerCalendarEventComponent {
  @Input({ required: true }) calendarEvent!: ScheduleFromCalendarEvent;
  isBeingSubmitted = false;

  @HostBinding('attr.title') title = `Convert to task`;

  @HostBinding('class.isBeingSubmitted')
  get isBeingSubmittedG(): boolean {
    return this.isBeingSubmitted;
  }

  @HostListener('click', ['$event'])
  async onClick(): Promise<void> {
    if (this.isBeingSubmitted) {
      return;
    }

    this.isBeingSubmitted = true;
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

  constructor(
    private _taskService: TaskService,
    private _store: Store,
  ) {}
}
