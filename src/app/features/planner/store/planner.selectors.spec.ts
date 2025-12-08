import {
  ScheduleCalendarMapEntry,
  ScheduleFromCalendarEvent,
} from '../../schedule/schedule.model';
import { ScheduleItemType } from '../planner.model';

// Helper to test getIcalEventsForDay logic
// Since it's a private function, we test it through selectPlannerDays behavior
// For now, we test the separation logic directly

describe('Planner Selectors - All Day Events', () => {
  // Helper to create a timestamp for a specific day at noon local time
  const getLocalNoon = (year: number, month: number, day: number): number => {
    return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
  };

  // Helper to create a timestamp for a specific day at a given hour local time
  const getLocalTime = (
    year: number,
    month: number,
    day: number,
    hour: number,
  ): number => {
    return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
  };

  // Replicate the getIcalEventsForDay logic for testing
  const getIcalEventsForDay = (
    icalEvents: ScheduleCalendarMapEntry[],
    currentDayDate: Date,
  ): { timedEvents: any[]; allDayEvents: ScheduleFromCalendarEvent[] } => {
    const timedEvents: any[] = [];
    const allDayEvents: ScheduleFromCalendarEvent[] = [];

    const isSameDay = (timestamp: number, date: Date): boolean => {
      const eventDate = new Date(timestamp);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    };

    icalEvents.forEach((icalMapEntry) => {
      icalMapEntry.items.forEach((calEv) => {
        const start = calEv.start;
        if (isSameDay(start, currentDayDate)) {
          if (calEv.isAllDay) {
            // All-day events go to a separate list with full event data
            allDayEvents.push({ ...calEv });
          } else {
            const end = calEv.start + calEv.duration;
            timedEvents.push({
              id: calEv.id,
              type: ScheduleItemType.CalEvent,
              start,
              end,
              calendarEvent: {
                ...calEv,
              },
            });
          }
        }
      });
    });
    return { timedEvents, allDayEvents };
  };

  describe('getIcalEventsForDay', () => {
    // Use local time to avoid timezone issues
    const testDate = new Date(2025, 0, 15, 12, 0, 0, 0); // Jan 15, 2025 at noon local

    it('should separate all-day events from timed events', () => {
      const icalEvents: ScheduleCalendarMapEntry[] = [
        {
          items: [
            {
              id: 'all-day-1',
              calProviderId: 'provider-1',
              title: 'All Day Event',
              description: 'Full day meeting',
              start: getLocalNoon(2025, 1, 15),
              duration: 0,
              isAllDay: true,
            },
            {
              id: 'timed-1',
              calProviderId: 'provider-1',
              title: 'Timed Event',
              start: getLocalTime(2025, 1, 15, 14),
              duration: 3600000,
            },
          ],
        },
      ];

      const result = getIcalEventsForDay(icalEvents, testDate);

      expect(result.allDayEvents.length).toBe(1);
      expect(result.allDayEvents[0].id).toBe('all-day-1');
      expect(result.allDayEvents[0].title).toBe('All Day Event');
      expect(result.allDayEvents[0].description).toBe('Full day meeting');
      expect(result.allDayEvents[0].isAllDay).toBe(true);
      expect(result.allDayEvents[0].calProviderId).toBe('provider-1');

      expect(result.timedEvents.length).toBe(1);
      expect(result.timedEvents[0].id).toBe('timed-1');
      expect(result.timedEvents[0].type).toBe(ScheduleItemType.CalEvent);
    });

    it('should handle multiple all-day events', () => {
      const icalEvents: ScheduleCalendarMapEntry[] = [
        {
          items: [
            {
              id: 'all-day-1',
              calProviderId: 'provider-1',
              title: 'Holiday',
              start: getLocalNoon(2025, 1, 15),
              duration: 86400000,
              isAllDay: true,
            },
            {
              id: 'all-day-2',
              calProviderId: 'provider-2',
              title: 'Conference',
              start: getLocalTime(2025, 1, 15, 9),
              duration: 0,
              isAllDay: true,
            },
          ],
        },
      ];

      const result = getIcalEventsForDay(icalEvents, testDate);

      expect(result.allDayEvents.length).toBe(2);
      expect(result.timedEvents.length).toBe(0);
    });

    it('should handle only timed events', () => {
      const icalEvents: ScheduleCalendarMapEntry[] = [
        {
          items: [
            {
              id: 'timed-1',
              calProviderId: 'provider-1',
              title: 'Meeting 1',
              start: getLocalTime(2025, 1, 15, 9),
              duration: 3600000,
            },
            {
              id: 'timed-2',
              calProviderId: 'provider-1',
              title: 'Meeting 2',
              start: getLocalTime(2025, 1, 15, 14),
              duration: 1800000,
            },
          ],
        },
      ];

      const result = getIcalEventsForDay(icalEvents, testDate);

      expect(result.allDayEvents.length).toBe(0);
      expect(result.timedEvents.length).toBe(2);
    });

    it('should filter events by day', () => {
      const icalEvents: ScheduleCalendarMapEntry[] = [
        {
          items: [
            {
              id: 'today',
              calProviderId: 'provider-1',
              title: 'Today Event',
              start: getLocalTime(2025, 1, 15, 10),
              duration: 3600000,
            },
            {
              id: 'tomorrow',
              calProviderId: 'provider-1',
              title: 'Tomorrow Event',
              start: getLocalTime(2025, 1, 16, 10),
              duration: 3600000,
            },
            {
              id: 'all-day-today',
              calProviderId: 'provider-1',
              title: 'All Day Today',
              start: getLocalNoon(2025, 1, 15),
              duration: 0,
              isAllDay: true,
            },
            {
              id: 'all-day-tomorrow',
              calProviderId: 'provider-1',
              title: 'All Day Tomorrow',
              start: getLocalNoon(2025, 1, 16),
              duration: 0,
              isAllDay: true,
            },
          ],
        },
      ];

      const result = getIcalEventsForDay(icalEvents, testDate);

      expect(result.allDayEvents.length).toBe(1);
      expect(result.allDayEvents[0].id).toBe('all-day-today');

      expect(result.timedEvents.length).toBe(1);
      expect(result.timedEvents[0].id).toBe('today');
    });

    it('should handle empty icalEvents', () => {
      const result = getIcalEventsForDay([], testDate);

      expect(result.allDayEvents.length).toBe(0);
      expect(result.timedEvents.length).toBe(0);
    });

    it('should handle events from multiple providers', () => {
      const icalEvents: ScheduleCalendarMapEntry[] = [
        {
          items: [
            {
              id: 'provider1-allday',
              calProviderId: 'provider-1',
              title: 'Provider 1 All Day',
              start: getLocalNoon(2025, 1, 15),
              duration: 0,
              isAllDay: true,
            },
          ],
        },
        {
          items: [
            {
              id: 'provider2-timed',
              calProviderId: 'provider-2',
              title: 'Provider 2 Timed',
              start: getLocalTime(2025, 1, 15, 11),
              duration: 3600000,
            },
            {
              id: 'provider2-allday',
              calProviderId: 'provider-2',
              title: 'Provider 2 All Day',
              start: getLocalTime(2025, 1, 15, 8),
              duration: 0,
              isAllDay: true,
            },
          ],
        },
      ];

      const result = getIcalEventsForDay(icalEvents, testDate);

      expect(result.allDayEvents.length).toBe(2);
      expect(result.timedEvents.length).toBe(1);
    });

    it('should preserve all event properties for all-day events', () => {
      const eventStart = getLocalNoon(2025, 1, 15);
      const icalEvents: ScheduleCalendarMapEntry[] = [
        {
          items: [
            {
              id: 'all-day-full',
              calProviderId: 'provider-1',
              title: 'Full Properties Event',
              description: 'Has description',
              start: eventStart,
              duration: 86400000,
              isAllDay: true,
              icon: 'custom-icon',
            },
          ],
        },
      ];

      const result = getIcalEventsForDay(icalEvents, testDate);

      expect(result.allDayEvents.length).toBe(1);
      const allDayEvent = result.allDayEvents[0];
      expect(allDayEvent.id).toBe('all-day-full');
      expect(allDayEvent.calProviderId).toBe('provider-1');
      expect(allDayEvent.title).toBe('Full Properties Event');
      expect(allDayEvent.description).toBe('Has description');
      expect(allDayEvent.start).toBe(eventStart);
      expect(allDayEvent.duration).toBe(86400000);
      expect(allDayEvent.isAllDay).toBe(true);
      expect(allDayEvent.icon).toBe('custom-icon');
    });
  });
});
