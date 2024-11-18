// @ts-ignore
import ICAL from 'ical.js';
import { CalendarIntegrationEvent } from '../../calendar-integration/calendar-integration.model';

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
    if (ve.getFirstPropertyValue('rrule')) {
      calendarIntegrationEvents = calendarIntegrationEvents.concat(
        getForRecurring(ve, calProviderId, startTimestamp, endTimestamp),
      );
    } else if (ve.getFirstPropertyValue('dtstart').toJSDate().getTime() < endTimestamp) {
      calendarIntegrationEvents.push(
        convertVEventToCalendarIntegrationEvent(ve, calProviderId),
      );
    }
  });
  // console.timeEnd('TEST');
  return calendarIntegrationEvents;
};

const getForRecurring = (
  vevent: any,
  calProviderId: string,
  startTimestamp: number,
  endTimeStamp: number,
): CalendarIntegrationEvent[] => {
  const title: string = vevent.getFirstPropertyValue('summary');
  const description = vevent.getFirstPropertyValue('decscription');
  const start = vevent.getFirstPropertyValue('dtstart');
  const startDate = start.toJSDate();
  const startTimeStamp = startDate.getTime();
  const end = vevent.getFirstPropertyValue('dtend').toJSDate().getTime();
  const baseId = vevent.getFirstPropertyValue('uid');
  const duration = end - startTimeStamp;

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
};

const convertVEventToCalendarIntegrationEvent = (
  vevent: any,
  calProviderId: string,
): CalendarIntegrationEvent => {
  const start = vevent.getFirstPropertyValue('dtstart').toJSDate().getTime();
  // NOTE: if dtend is missing, it defaults to dtstart; @see #1814 and RFC 2455
  // detailed comment in #1814:
  // https://github.com/johannesjo/super-productivity/issues/1814#issuecomment-1008132824
  const endVal = vevent.getFirstPropertyValue('dtend');
  const end = endVal ? endVal.toJSDate().getTime() : start;

  return {
    id: vevent.getFirstPropertyValue('uid'),
    title: vevent.getFirstPropertyValue('summary') || '',
    description: vevent.getFirstPropertyValue('description') || undefined,
    start,
    duration: end - start,
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
