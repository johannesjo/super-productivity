import { TestBed } from '@angular/core/testing';
import { CalendarCommonInterfacesService } from './calendar-common-interfaces.service';
import { CalendarIntegrationService } from '../../../calendar-integration/calendar-integration.service';
import { IssueProviderService } from '../../issue-provider.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ICalIssueReduced } from './calendar.model';
import { getDbDateStr } from '../../../../util/get-db-date-str';

describe('CalendarCommonInterfacesService', () => {
  let service: CalendarCommonInterfacesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CalendarCommonInterfacesService,
        {
          provide: CalendarIntegrationService,
          useValue: {},
        },
        {
          provide: IssueProviderService,
          useValue: {},
        },
      ],
    });
    service = TestBed.inject(CalendarCommonInterfacesService);
  });

  describe('getAddTaskData', () => {
    it('should use dueDay for all-day events', () => {
      const allDayEvent: ICalIssueReduced = {
        id: 'all-day-123',
        calProviderId: 'provider-1',
        title: 'All Day Task',
        description: 'Task description',
        start: new Date('2025-01-15T00:00:00Z').getTime(),
        duration: 0,
        isAllDay: true,
      };

      const result = service.getAddTaskData(allDayEvent);

      expect(result.title).toBe('All Day Task');
      expect(result.dueDay).toBe(getDbDateStr(allDayEvent.start));
      expect(result.dueWithTime).toBeUndefined();
      expect(result.issueType).toBe('ICAL');
    });

    it('should use dueWithTime for timed events', () => {
      const timedEvent: ICalIssueReduced = {
        id: 'timed-123',
        calProviderId: 'provider-1',
        title: 'Timed Task',
        description: 'Task description',
        start: new Date('2025-01-15T14:30:00Z').getTime(),
        duration: 3600000, // 1 hour
        isAllDay: false,
      };

      const result = service.getAddTaskData(timedEvent);

      expect(result.title).toBe('Timed Task');
      expect(result.dueWithTime).toBe(timedEvent.start);
      expect(result.dueDay).toBeUndefined();
      expect(result.timeEstimate).toBe(3600000);
    });

    it('should use dueWithTime when isAllDay is undefined', () => {
      const eventWithoutAllDayFlag: ICalIssueReduced = {
        id: 'event-123',
        calProviderId: 'provider-1',
        title: 'Regular Event',
        start: new Date('2025-01-15T10:00:00Z').getTime(),
        duration: 1800000, // 30 minutes
      };

      const result = service.getAddTaskData(eventWithoutAllDayFlag);

      expect(result.dueWithTime).toBe(eventWithoutAllDayFlag.start);
      expect(result.dueDay).toBeUndefined();
    });

    it('should include common task properties for all-day events', () => {
      const allDayEvent: ICalIssueReduced = {
        id: 'all-day-456',
        calProviderId: 'provider-2',
        title: 'Meeting All Day',
        description: 'Important meeting',
        start: new Date('2025-02-20T00:00:00Z').getTime(),
        duration: 86400000, // 24 hours
        isAllDay: true,
      };

      const result = service.getAddTaskData(allDayEvent);

      expect(result.issueId).toBe('all-day-456');
      expect(result.issueProviderId).toBe('provider-2');
      expect(result.issueType).toBe('ICAL');
      expect(result.notes).toBe('Important meeting');
      expect(result.timeEstimate).toBe(86400000);
      expect(result.issueWasUpdated).toBe(false);
      expect(result.issueLastUpdated).toBeDefined();
    });

    it('should handle empty description', () => {
      const eventWithoutDescription: ICalIssueReduced = {
        id: 'event-789',
        calProviderId: 'provider-1',
        title: 'No Description Event',
        start: new Date('2025-01-15T09:00:00Z').getTime(),
        duration: 3600000,
        isAllDay: true,
      };

      const result = service.getAddTaskData(eventWithoutDescription);

      expect(result.notes).toBe('');
    });
  });
});
