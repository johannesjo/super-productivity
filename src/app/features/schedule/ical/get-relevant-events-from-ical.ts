// @ts-ignore
import ICAL from 'ical.js';
import { CalendarIntegrationEvent } from '../../calendar-integration/calendar-integration.model';
import { Log } from '../../../core/log';

// NOTE: this sucks and is slow, but writing a new ical parser would be very hard... :(

export const getRelevantEventsForCalendarIntegrationFromIcal = (
  icalData: string,
  calProviderId: string,
  startTimestamp: number,
  endTimestamp: number,
): CalendarIntegrationEvent[] => {
  let calendarIntegrationEvents: CalendarIntegrationEvent[] = [];
  const allPossibleFutureEvents = getAllPossibleEventsAfterStartFromIcal(
    icalData,
    new Date(startTimestamp),
  );
  allPossibleFutureEvents.forEach((ve) => {
    try {
      if (ve.getFirstPropertyValue('rrule')) {
        calendarIntegrationEvents = calendarIntegrationEvents.concat(
          getForRecurring(ve, calProviderId, startTimestamp, endTimestamp),
        );
      } else if (
        ve.getFirstPropertyValue('dtstart').toJSDate().getTime() < endTimestamp
      ) {
        calendarIntegrationEvents.push(
          convertVEventToCalendarIntegrationEvent(ve, calProviderId),
        );
      }
    } catch (error) {
      Log.warn(
        'Failed to process event:',
        ve.getFirstPropertyValue('uid'),
        ve.getFirstPropertyValue('summary'),
        error,
      );
    }
  });
  // Log.timeEnd('TEST');
  return calendarIntegrationEvents;
};

const calculateEventDuration = (vevent: any, startTimeStamp: number): number => {
  // NOTE: Per RFC 2445, events can have either DTEND or DURATION, but not both
  // If neither is present, the event ends at DTSTART (zero duration)
  const dtend = vevent.getFirstPropertyValue('dtend');
  if (dtend) {
    return dtend.toJSDate().getTime() - startTimeStamp;
  }

  const durationProp = vevent.getFirstPropertyValue('duration');
  if (durationProp) {
    // ICAL.Duration provides toSeconds() method
    return durationProp.toSeconds() * 1000;
  }

  // Default to zero duration if neither DTEND nor DURATION is present
  return 0;
};

const getForRecurring = (
  vevent: any,
  calProviderId: string,
  startTimestamp: number,
  endTimeStamp: number,
): CalendarIntegrationEvent[] => {
  try {
    const title: string = vevent.getFirstPropertyValue('summary');
    const description = vevent.getFirstPropertyValue('description');
    const start = vevent.getFirstPropertyValue('dtstart');
    const startDate = start.toJSDate();
    const startTimeStamp = startDate.getTime();
    const baseId = vevent.getFirstPropertyValue('uid');

    // Calculate duration from either dtend, DURATION property, or default to 0
    // This follows RFC 2445 which allows either DTEND or DURATION (but not both)
    const duration = calculateEventDuration(vevent, startTimeStamp);

    const recur = vevent.getFirstPropertyValue('rrule');

    const iter = recur.iterator(start);

    const evs: CalendarIntegrationEvent[] = [];
    for (let next = iter.next(); next; next = iter.next()) {
      const nextTimestamp = next.toJSDate().getTime();
      if (nextTimestamp <= endTimeStamp && nextTimestamp >= startTimestamp) {
        evs.push({
          title,
          start: nextTimestamp,
          duration,
          id: baseId + '_' + next,
          calProviderId,
          description: description || undefined,
        });
      } else if (nextTimestamp > endTimeStamp) {
        return evs;
      }
    }
    return evs;
  } catch (error) {
    Log.warn(
      'Failed to process recurring event:',
      vevent.getFirstPropertyValue('uid'),
      vevent.getFirstPropertyValue('summary'),
      error,
    );
    return [];
  }
};

const convertVEventToCalendarIntegrationEvent = (
  vevent: any,
  calProviderId: string,
): CalendarIntegrationEvent => {
  const start = vevent.getFirstPropertyValue('dtstart').toJSDate().getTime();
  // NOTE: if dtend is missing, it defaults to dtstart; @see #1814 and RFC 2455
  // detailed comment in #1814:
  // https://github.com/johannesjo/super-productivity/issues/1814#issuecomment-1008132824
  const duration = calculateEventDuration(vevent, start);

  return {
    id: vevent.getFirstPropertyValue('uid'),
    title: vevent.getFirstPropertyValue('summary') || '',
    description: vevent.getFirstPropertyValue('description') || undefined,
    start,
    duration,
    calProviderId,
  };
};

const getAllPossibleEventsAfterStartFromIcal = (icalData: string, start: Date): any[] => {
  const c = ICAL.parse(icalData);
  const comp = new ICAL.Component(c);
  const tzAdded: string[] = [];
  if (comp.getFirstSubcomponent('vtimezone')) {
    for (const vtz of comp.getAllSubcomponents('vtimezone')) {
      const tz = new ICAL.Timezone({
        tzid: vtz.getFirstPropertyValue('tzid'),
        component: vtz,
      });

      if (!ICAL.TimezoneService.has(tz.tzid)) {
        ICAL.TimezoneService.register(tz);
        tzAdded.push(tz.tzid);
      }
    }
  }
  const vevents = ICAL.helpers.updateTimezones(comp).getAllSubcomponents('vevent');

  const allPossibleFutureEvents = vevents.filter(
    (ve: any) =>
      ve.getFirstPropertyValue('dtstart').toJSDate() >= start ||
      (ve.getFirstPropertyValue('rrule') &&
        (!ve.getFirstPropertyValue('rrule')?.until?.toJSDate() ||
          ve.getFirstPropertyValue('rrule')?.until?.toJSDate() > start)),
  );

  for (const tzid of tzAdded) {
    ICAL.TimezoneService.remove(tzid);
  }

  return allPossibleFutureEvents;
};
