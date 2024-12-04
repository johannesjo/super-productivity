import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  inject,
  Input,
} from '@angular/core';
import { ScheduleFromCalendarEvent } from '../../schedule/schedule.model';
import { IssueService } from '../../issue/issue.service';

@Component({
  selector: 'planner-calendar-event',
  templateUrl: './planner-calendar-event.component.html',
  styleUrl: './planner-calendar-event.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerCalendarEventComponent {
  private _issueService = inject(IssueService);

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
    this._issueService.addTaskFromIssue({
      issueDataReduced: this.calendarEvent,
      issueProviderId: this.calendarEvent.calProviderId,
      issueProviderKey: 'CALENDAR',
      isForceDefaultProject: true,
    });
  }
}
