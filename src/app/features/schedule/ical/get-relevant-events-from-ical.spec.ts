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

    it('should handle recurring all-day event without end time', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-allday-no-end
DTSTART;VALUE=DATE:20250115
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:Recurring All Day No End
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
        expect(event.title).toBe('Recurring All Day No End');
        expect(event.duration).toBe(0); // No duration specified
      });
    });

    it('should gracefully skip event with null dtstart', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-missing-dtstart
SUMMARY:Event Without Start Date
DESCRIPTION:This event has no DTSTART
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      // Should not crash, event should be skipped
      expect(events).toBeDefined();
      expect(events.length).toBe(0);
    });

    it('should handle mix of valid and invalid events gracefully', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:valid-event
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
SUMMARY:Valid Event
END:VEVENT
BEGIN:VEVENT
UID:invalid-event-no-start
SUMMARY:Invalid Event No Start
END:VEVENT
BEGIN:VEVENT
UID:another-valid-event
DTSTART:20250116T140000Z
DURATION:PT30M
SUMMARY:Another Valid Event
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      // Should import 2 valid events and skip the invalid one
      expect(events.length).toBe(2);
      expect(events.find((e) => e.title === 'Valid Event')).toBeDefined();
      expect(events.find((e) => e.title === 'Another Valid Event')).toBeDefined();
      expect(events.find((e) => e.title === 'Invalid Event No Start')).toBeUndefined();
    });
  });

  describe('RECURRENCE-ID handling (modified recurring events)', () => {
    it('should not create duplicate when recurring event has one modified instance', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-event-modified@test
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:Daily Meeting
END:VEVENT
BEGIN:VEVENT
UID:recurring-event-modified@test
RECURRENCE-ID:20250116T100000Z
DTSTART:20250116T140000Z
DTEND:20250116T150000Z
SUMMARY:Daily Meeting (Moved)
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      // Should have exactly 3 events (not 4)
      expect(events.length).toBe(3);

      // Find the modified instance
      const modifiedEvent = events.find((e) => e.title === 'Daily Meeting (Moved)');
      expect(modifiedEvent).toBeDefined();
      // Modified event should be at 14:00 not 10:00
      expect(modifiedEvent!.start).toBe(new Date('2025-01-16T14:00:00Z').getTime());
      expect(modifiedEvent!.duration).toBe(3600000); // 1 hour

      // Other events should be unmodified
      const unmodifiedEvents = events.filter((e) => e.title === 'Daily Meeting');
      expect(unmodifiedEvents.length).toBe(2);
    });

    it('should handle multiple modified instances in recurring event', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:multi-modified@test
DTSTART:20250115T100000Z
DURATION:PT1H
RRULE:FREQ=DAILY;COUNT=5
SUMMARY:Standup
END:VEVENT
BEGIN:VEVENT
UID:multi-modified@test
RECURRENCE-ID:20250116T100000Z
DTSTART:20250116T110000Z
DURATION:PT1H
SUMMARY:Standup (Late)
END:VEVENT
BEGIN:VEVENT
UID:multi-modified@test
RECURRENCE-ID:20250118T100000Z
DTSTART:20250118T090000Z
DURATION:PT30M
SUMMARY:Standup (Early & Short)
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      // Should have exactly 5 events (not 7)
      expect(events.length).toBe(5);

      // Verify modified instances
      const lateEvent = events.find((e) => e.title === 'Standup (Late)');
      expect(lateEvent).toBeDefined();
      expect(lateEvent!.start).toBe(new Date('2025-01-16T11:00:00Z').getTime());

      const earlyEvent = events.find((e) => e.title === 'Standup (Early & Short)');
      expect(earlyEvent).toBeDefined();
      expect(earlyEvent!.start).toBe(new Date('2025-01-18T09:00:00Z').getTime());
      expect(earlyEvent!.duration).toBe(1800000); // 30 minutes

      // Unmodified events
      const unmodifiedEvents = events.filter((e) => e.title === 'Standup');
      expect(unmodifiedEvents.length).toBe(3);
    });

    it('should handle cancelled instance in recurring event', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-with-cancel@test
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
RRULE:FREQ=DAILY;COUNT=4
SUMMARY:Team Sync
END:VEVENT
BEGIN:VEVENT
UID:event-with-cancel@test
RECURRENCE-ID:20250117T100000Z
DTSTART:20250117T100000Z
DTEND:20250117T110000Z
SUMMARY:Team Sync
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      // Should have 3 events (4 minus the cancelled one)
      expect(events.length).toBe(3);

      // Verify no event on the cancelled date
      const cancelledDate = new Date('2025-01-17T10:00:00Z').getTime();
      const eventOnCancelledDate = events.find((e) => e.start === cancelledDate);
      expect(eventOnCancelledDate).toBeUndefined();
    });

    it('should handle all-day recurring event with DATE-based RECURRENCE-ID', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:allday-modified@test
DTSTART;VALUE=DATE:20250115
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:All Day Event
END:VEVENT
BEGIN:VEVENT
UID:allday-modified@test
RECURRENCE-ID;VALUE=DATE:20250116
DTSTART;VALUE=DATE:20250116
SUMMARY:All Day Event (Modified)
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      // Should have exactly 3 events (not 4)
      expect(events.length).toBe(3);

      const modifiedEvent = events.find((e) => e.title === 'All Day Event (Modified)');
      expect(modifiedEvent).toBeDefined();

      const unmodifiedEvents = events.filter((e) => e.title === 'All Day Event');
      expect(unmodifiedEvents.length).toBe(2);
    });

    it('should handle recurring event without exceptions (no regression)', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:no-exceptions@test
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:Regular Recurring
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      // Should still work correctly
      expect(events.length).toBe(3);
      events.forEach((event) => {
        expect(event.title).toBe('Regular Recurring');
      });
    });

    it('should handle exception outside time range gracefully', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:exception-out-of-range@test
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:Event Series
END:VEVENT
BEGIN:VEVENT
UID:exception-out-of-range@test
RECURRENCE-ID:20240101T100000Z
DTSTART:20240101T140000Z
DTEND:20240101T150000Z
SUMMARY:Event Series (Old Modified)
END:VEVENT
END:VCALENDAR`;

      const events = getRelevantEventsForCalendarIntegrationFromIcal(
        icalData,
        calProviderId,
        startTimestamp,
        endTimestamp,
      );

      // Should have 3 events from the RRULE (exception is outside range)
      expect(events.length).toBe(3);
      events.forEach((event) => {
        expect(event.title).toBe('Event Series');
      });
    });
  });
});
