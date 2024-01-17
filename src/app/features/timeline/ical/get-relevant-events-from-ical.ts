// @ts-ignore
import ICAL from 'ical.js';
import { TimelineFromCalendarEvent } from '../timeline.model';
import { CalendarIntegrationEvent } from '../../calendar-integration/calendar-integration.model';

// NOTE: this sucks and is slow, but writing a new ical parser would be very hard... :(

export const getRelevantEventsForCalendarIntegrationFromIcal = (
  icalData: string,
  endTimestamp: number,
): CalendarIntegrationEvent[] => {
  // console.time('TEST');
  const now = new Date();
  const nowTimestamp = now.getTime();
  const icalNow = ICAL.Time.now();
  let calendarIntegrationEvents: CalendarIntegrationEvent[] = [];
  const allPossibleFutureEvents = getAllPossibleFutureEventsFromIcal(icalData, now);
  allPossibleFutureEvents.forEach((ve) => {
    if (ve.getFirstPropertyValue('rrule')) {
      calendarIntegrationEvents = calendarIntegrationEvents.concat(
        getForRecurring(ve, icalNow, nowTimestamp, endTimestamp),
      );
    } else if (ve.getFirstPropertyValue('dtstart').toJSDate().getTime() < endTimestamp) {
      calendarIntegrationEvents.push(convertVEventToCalendarIntegrationEvent(ve));
    }
  });
  // console.timeEnd('TEST');
  return calendarIntegrationEvents;
};

export const getRelevantEventsFromIcal = (
  icalData: string,
  endTimestamp: number,
): TimelineFromCalendarEvent[] => {
  // console.time('TEST');
  const now = new Date();
  const nowTimestamp = now.getTime();
  const icalNow = ICAL.Time.now();
  let timelineEvents: TimelineFromCalendarEvent[] = [];
  const allPossibleFutureEvents = getAllPossibleFutureEventsFromIcal(icalData, now);
  allPossibleFutureEvents.forEach((ve) => {
    if (ve.getFirstPropertyValue('rrule')) {
      timelineEvents = timelineEvents.concat(
        getForRecurring(ve, icalNow, nowTimestamp, endTimestamp),
      );
    } else if (ve.getFirstPropertyValue('dtstart').toJSDate().getTime() < endTimestamp) {
      timelineEvents.push(convertVEventToTimelineEvent(ve));
    }
  });
  // console.timeEnd('TEST');
  return timelineEvents;
};

const getForRecurring = (
  vevent: any,
  weirdIcalStart: ICAL.Time,
  nowTimestamp: number,
  endTimeStamp: number,
): CalendarIntegrationEvent[] => {
  const title: string = vevent.getFirstPropertyValue('summary');
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
    if (nextTimestamp <= endTimeStamp && nextTimestamp >= nowTimestamp) {
      evs.push({
        title,
        start: nextTimestamp,
        duration,
        id: baseId + '_' + next,
      });
    } else if (nextTimestamp > endTimeStamp) {
      return evs;
    }
  }
  return evs;
};

const convertVEventToTimelineEvent = (vevent: any): TimelineFromCalendarEvent => {
  const start = vevent.getFirstPropertyValue('dtstart').toJSDate().getTime();
  // NOTE: if dtend is missing, it defaults to dtstart; @see #1814 and RFC 2455
  // detailed comment in #1814:
  // https://github.com/johannesjo/super-productivity/issues/1814#issuecomment-1008132824
  const endVal = vevent.getFirstPropertyValue('dtend');
  const end = endVal ? endVal.toJSDate().getTime() : start;

  return {
    title: vevent.getFirstPropertyValue('summary'),
    start,
    duration: end - start,
  };
};

const convertVEventToCalendarIntegrationEvent = (
  vevent: any,
): CalendarIntegrationEvent => {
  const start = vevent.getFirstPropertyValue('dtstart').toJSDate().getTime();
  // NOTE: if dtend is missing, it defaults to dtstart; @see #1814 and RFC 2455
  // detailed comment in #1814:
  // https://github.com/johannesjo/super-productivity/issues/1814#issuecomment-1008132824
  const endVal = vevent.getFirstPropertyValue('dtend');
  const end = endVal ? endVal.toJSDate().getTime() : start;

  return {
    id: vevent.getFirstPropertyValue('uid'),
    title: vevent.getFirstPropertyValue('summary'),
    start,
    duration: end - start,
  };
};

const getAllPossibleFutureEventsFromIcal = (icalData: string, now: Date): any[] => {
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
        ICAL.TimezoneService.register(tz.tzid, tz);
        tzAdded.push(tz.tzid);
      }
    }
  }
  const vevents = ICAL.helpers.updateTimezones(comp).getAllSubcomponents('vevent');

  const allPossibleFutureEvents = vevents.filter(
    (ve: any) =>
      ve.getFirstPropertyValue('dtstart').toJSDate() >= now ||
      (ve.getFirstPropertyValue('rrule') &&
        (!ve.getFirstPropertyValue('rrule')?.until?.toJSDate() ||
          ve.getFirstPropertyValue('rrule')?.until?.toJSDate() > now)),
  );

  for (const tzid of tzAdded) {
    ICAL.TimezoneService.remove(tzid);
  }

  return allPossibleFutureEvents;
};
