import { CalendarIntegrationEvent } from './calendar-integration.model';
import { CalendarProvider } from '../config/global-config.model';
// NOTE: we start 120 minutes ago
const START_OFFSET = 2 * 60 * 60 * 1000;
export const isCalenderEventDue = (
  calEv: CalendarIntegrationEvent,
  calProvider: CalendarProvider,
  skippedEventIds: string[],
  now: number,
): boolean => {
  // console.log(calEv);
  // console.log(calEv.start >= now - START_OFFSET, calEv.start, now - START_OFFSET);
  // console.log(
  //   calEv.start <= now + (calProvider.showBannerBeforeThreshold || 0),
  //   calEv.start,
  //   now + (calProvider.showBannerBeforeThreshold || 0),
  // );
  return (
    !skippedEventIds.includes(calEv.id) &&
    calEv.start >= now - START_OFFSET &&
    // is due with configured threshold
    calEv.start <= now + (calProvider.showBannerBeforeThreshold || 0)
    // now < calEv.start + calEv.duration
  );
};
