import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  Input,
} from '@angular/core';
import { ScheduleFromCalendarEvent } from '../../schedule/schedule.model';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';

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
    this._calendarIntegrationService.addEventAsTask(this.calendarEvent);
  }

  constructor(private _calendarIntegrationService: CalendarIntegrationService) {}
}
