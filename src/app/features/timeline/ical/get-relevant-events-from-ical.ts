// @ts-ignore
import ICAL from 'ical.js';
import { TimelineFromCalendarEvent } from '../timeline.model';

export const getRelevantEventsFromIcal = (
  icalData: string,
): TimelineFromCalendarEvent[] => {
  const timelineEvents: TimelineFromCalendarEvent[] = [];
  const allPossibleFutureEvents = getAllPossibleFutureEventsFromIcal(icalData);
  allPossibleFutureEvents.forEach((ve) => {
    if (ve.getFirstPropertyValue('rrule')) {
    } else {
      timelineEvents.push(convertVEventToTimelineEvent(ve));
    }
  });
  console.log({ timelineEvents });

  return timelineEvents;
};

const convertVEventToTimelineEvent = (vevent: any): TimelineFromCalendarEvent => {
  const start = vevent.getFirstPropertyValue('dtstart').toJSDate().getTime();
  const end = vevent.getFirstPropertyValue('dtend').toJSDate().getTime();
  return {
    title: vevent.getFirstPropertyValue('summary'),
    start,
    duration: end - start,
  };
};

const getAllPossibleFutureEventsFromIcal = (icalData: string): any[] => {
  const c = ICAL.parse(icalData);
  const comp = new ICAL.Component(c);
  const vevents = comp.getAllSubcomponents('vevent');
  const now = new Date();
  const allPossibleFutureEvents = vevents.filter(
    (ve: any) =>
      new Date(ve.getFirstPropertyValue('dtstart')) >= now ||
      (ve.getFirstPropertyValue('rrule') &&
        (!ve.getFirstPropertyValue('rrule')?.until ||
          ve.getFirstPropertyValue('rrule')?.until?.toJSDate() > now)),
  );

  allPossibleFutureEvents.forEach((ve: any) =>
    console.log(
      ve.getFirstPropertyValue('summary'),
      ve.getFirstPropertyValue('rrule'),
      ve.getFirstPropertyValue('rrule')?.until?.toJSDate(),
    ),
  );
  console.log(allPossibleFutureEvents);

  return allPossibleFutureEvents;
};
