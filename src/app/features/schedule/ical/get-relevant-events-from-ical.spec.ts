import { getRelevantEventsForCalendarIntegrationFromIcal } from './get-relevant-events-from-ical';

describe('getRelevantEventsForCalendarIntegrationFromIcal', () => {
  const calProviderId = 'test-provider';
  const startTimestamp = new Date('2025-01-01T00:00:00Z').getTime();
  const endTimestamp = new Date('2025-12-31T23:59:59Z').getTime();

  describe('non-recurring events', () => {
    it('should import event with dtend', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
SUMMARY:Test Event with End
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Test Event with End');
      expect(events[0].duration).toBe(3600000); // 1 hour in ms
    });

    it('should import event without dtend (zero duration)', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-2
DTSTART:20250115T100000Z
SUMMARY:Test Event without End
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Test Event without End');
      expect(events[0].duration).toBe(0);
    });
  });

  describe('recurring events', () => {
    it('should import recurring event with dtend', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-event-1
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
RRULE:FREQ=WEEKLY;COUNT=3
SUMMARY:Weekly Meeting with End
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(3);
      events.forEach((event) => {
        expect(event.title).toBe('Weekly Meeting with End');
        expect(event.duration).toBe(3600000); // 1 hour
      });
    });

    it('should import recurring event with DURATION instead of dtend', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-event-2
DTSTART:20250115T100000Z
DURATION:PT1H30M
RRULE:FREQ=DAILY;COUNT=2
SUMMARY:Daily Task with Duration
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(2);
      events.forEach((event) => {
        expect(event.title).toBe('Daily Task with Duration');
        expect(event.duration).toBe(5400000); // 1.5 hours in ms
      });
    });

    it('should import recurring event without dtend or DURATION (zero duration)', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-event-3
DTSTART:20250115T100000Z
RRULE:FREQ=DAILY;COUNT=2
SUMMARY:Daily Reminder without Duration
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(2);
      events.forEach((event) => {
        expect(event.title).toBe('Daily Reminder without Duration');
        expect(event.duration).toBe(0);
      });
    });

    it('should handle recurring event with very short duration', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-event-4
DTSTART:20250115T100000Z
DURATION:PT15M
RRULE:FREQ=DAILY;COUNT=2
SUMMARY:15 Minute Standup
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(2);
      events.forEach((event) => {
        expect(event.title).toBe('15 Minute Standup');
        expect(event.duration).toBe(900000); // 15 minutes in ms
      });
    });

    it('should keep descriptions for recurring events', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-event-desc
DTSTART:20250115T100000Z
DURATION:PT45M
RRULE:FREQ=DAILY;COUNT=2
SUMMARY:Recurring With Description
DESCRIPTION:Recurring description text
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(2);
      events.forEach((event) => {
        expect(event.title).toBe('Recurring With Description');
        expect(event.description).toBe('Recurring description text');
      });
    });
  });

  describe('mixed event types', () => {
    it('should import mix of recurring and non-recurring events', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:single-event
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
SUMMARY:Single Event
END:VEVENT
BEGIN:VEVENT
UID:recurring-event
DTSTART:20250116T140000Z
DURATION:PT30M
RRULE:FREQ=DAILY;COUNT=2
SUMMARY:Recurring Event
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(3);
      const singleEvent = events.find((e) => e.title === 'Single Event');
      const recurringEvents = events.filter((e) => e.title === 'Recurring Event');

      expect(singleEvent).toBeDefined();
      expect(singleEvent!.duration).toBe(3600000);
      expect(recurringEvents.length).toBe(2);
      recurringEvents.forEach((event) => {
        expect(event.duration).toBe(1800000); // 30 minutes
      });
    });
  });

  describe('error handling', () => {
    it('should handle events outside the time range', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:past-event
DTSTART:20240101T100000Z
DTEND:20240101T110000Z
SUMMARY:Past Event
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(0);
    });

    it('should continue processing even if one event fails', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:good-event
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
SUMMARY:Good Event
END:VEVENT
BEGIN:VEVENT
UID:bad-event
DTSTART:20250116T100000Z
DTEND:INVALIDDATE
SUMMARY:Bad Event
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Good Event');
      expect(events[0].duration).toBe(3600000);
    });
  });

  describe('edge cases', () => {
    it('should handle all-day events', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:all-day-event
DTSTART;VALUE=DATE:20250115
DTEND;VALUE=DATE:20250116
SUMMARY:All Day Event
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBe(1);
      expect(events[0].title).toBe('All Day Event');
    });

    it('should handle recurring event with UNTIL', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-until
DTSTART:20250115T100000Z
DURATION:PT1H
RRULE:FREQ=DAILY;UNTIL=20250117T235959Z
SUMMARY:Daily Until Event
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        expect(event.title).toBe('Daily Until Event');
        expect(event.duration).toBe(3600000);
      });
    });
  });
});
