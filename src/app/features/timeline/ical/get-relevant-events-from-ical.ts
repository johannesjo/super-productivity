// @ts-ignore
import ICAL from 'ical.js';
import { TimelineFromCalendarEvent } from '../timeline.model';

// NOTE: this sucks and is slow, but writing a new ical parser would be very hard... :(

const TWO_MONTHS = 60 * 60 * 1000 * 24 * 62;
const DEFAULT_DURATION = 15 * 60 * 1000;

export const getRelevantEventsFromIcal = (
  icalData: string,
): TimelineFromCalendarEvent[] => {
  // console.time('TEST');
  const now = new Date();
  const nowTimestamp = now.getTime();
  const icalNow = ICAL.Time.now();
  const endTimestamp = Date.now() + TWO_MONTHS;
  let timelineEvents: TimelineFromCalendarEvent[] = [];
  const allPossibleFutureEvents = getAllPossibleFutureEventsFromIcal(icalData, now);
  allPossibleFutureEvents.forEach((ve) => {
    if (ve.getFirstPropertyValue('rrule')) {
      timelineEvents = timelineEvents.concat(
        getForReoccurring(ve, icalNow, nowTimestamp, endTimestamp),
      );
    } else if (ve.getFirstPropertyValue('dtstart').toJSDate().getTime() < endTimestamp) {
      timelineEvents.push(convertVEventToTimelineEvent(ve));
    }
  });
  // console.timeEnd('TEST');
  return timelineEvents;
};

const getForReoccurring = (
  vevent: any,
  weirdIcalStart: ICAL.Time,
  nowTimestamp: number,
  endTimeStamp: number,
): TimelineFromCalendarEvent[] => {
  const title = vevent.getFirstPropertyValue('summary');
  const start = vevent.getFirstPropertyValue('dtstart');
  const startDate = start.toJSDate();
  const startTimeStamp = startDate.getTime();
  const end = vevent.getFirstPropertyValue('dtend').toJSDate().getTime();
  const duration = end - startTimeStamp;

  const recur = vevent.getFirstPropertyValue('rrule');

  // const dayDiffToNowInDays = Math.round(
  //   (nowTimestamp - startTimeStamp) / (1000 * 60 * 60 * 24),
  // );
  // if (dayDiffToNowInDays > 0 && !recur.isByCount()) {
  //   start.adjust(dayDiffToNowInDays - 1, 0, 0, 0);
  // }

  const iter = recur.iterator(start);

  const evs = [];
  for (let next = iter.next(); next; next = iter.next()) {
    const nextTimestamp = next.toJSDate().getTime();
    if (nextTimestamp <= endTimeStamp && nextTimestamp >= nowTimestamp) {
      evs.push({
        title,
        start: nextTimestamp,
        duration,
      });
    } else if (nextTimestamp > endTimeStamp) {
      return evs;
    }
  }
  return evs;
};

const convertVEventToTimelineEvent = (vevent: any): TimelineFromCalendarEvent => {
  const start = vevent.getFirstPropertyValue('dtstart').toJSDate().getTime();
  // NOTE: dtend might not always be defined for some reason @see #1814
  const endVal = vevent.getFirstPropertyValue('dtend');
  const end = endVal ? endVal.toJSDate().getTime() : start + DEFAULT_DURATION;

  return {
    title: vevent.getFirstPropertyValue('summary'),
    start,
    duration: end - start,
  };
};

const getAllPossibleFutureEventsFromIcal = (icalData: string, now: Date): any[] => {
  const c = ICAL.parse(icalData);
  const comp = new ICAL.Component(c);
  const vevents = comp.getAllSubcomponents('vevent');

  const allPossibleFutureEvents = vevents.filter(
    (ve: any) =>
      ve.getFirstPropertyValue('dtstart').toJSDate() >= now ||
      (ve.getFirstPropertyValue('rrule') &&
        (!ve.getFirstPropertyValue('rrule')?.until?.toJSDate() ||
          ve.getFirstPropertyValue('rrule')?.until?.toJSDate() > now)),
  );

  return allPossibleFutureEvents;
};
