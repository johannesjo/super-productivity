import { CalendarIntegrationEvent } from './calendar-integration.model';
import { IssueProviderCalendar } from '../issue/issue.model';
import { matchesAnyCalendarEventId } from './get-calendar-event-id-candidates';
// NOTE: we start 120 minutes ago
const START_OFFSET = 2 * 60 * 60 * 1000;
export const isCalenderEventDue = (
  calEv: CalendarIntegrationEvent,
  calProvider: IssueProviderCalendar,
  skippedEventIds: string[],
  now: number,
): boolean => {
  // Log.log(calEv);
  // Log.log(calEv.start >= now - START_OFFSET, calEv.start, now - START_OFFSET);
  // Log.log(
  //   calEv.start <= now + (calProvider.showBannerBeforeThreshold || 0),
  //   calEv.start,
  //   now + (calProvider.showBannerBeforeThreshold || 0),
  // );
  return (
    !matchesAnyCalendarEventId(calEv, skippedEventIds) &&
    calEv.start >= now - START_OFFSET &&
    // is due with configured threshold
    calEv.start <= now + (calProvider.showBannerBeforeThreshold || 0)
    // now < calEv.start + calEv.duration
  );
};
