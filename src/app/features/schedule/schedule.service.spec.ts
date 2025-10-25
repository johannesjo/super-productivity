import { TestBed } from '@angular/core/testing';
import { ScheduleService } from './schedule.service';
import { DateService } from '../../core/date/date.service';
import { provideMockStore } from '@ngrx/store/testing';
import { selectTimelineTasks } from '../work-context/store/work-context.selectors';
import { selectTaskRepeatCfgsWithAndWithoutStartTime } from '../task-repeat-cfg/store/task-repeat-cfg.selectors';
import { selectTimelineConfig } from '../config/store/global-config.reducer';
import { selectPlannerDayMap } from '../planner/store/planner.selectors';
import { of } from 'rxjs';
import { CalendarIntegrationService } from '../calendar-integration/calendar-integration.service';
import { TaskService } from '../tasks/task.service';

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ScheduleService,
        DateService,
        provideMockStore({
          selectors: [
            { selector: selectTimelineTasks, value: { unPlanned: [], planned: [] } },
            {
              selector: selectTaskRepeatCfgsWithAndWithoutStartTime,
              value: { withStartTime: [], withoutStartTime: [] },
            },
            {
              selector: selectTimelineConfig,
              value: { isWorkStartEndEnabled: false, isLunchBreakEnabled: false },
            },
            { selector: selectPlannerDayMap, value: {} },
          ],
        }),
        {
          provide: CalendarIntegrationService,
          useValue: { icalEvents$: of([]) },
        },
        {
          provide: TaskService,
          useValue: { currentTaskId: () => null },
        },
      ],
    });
    service = TestBed.inject(ScheduleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getMonthDaysToShow', () => {
    it('should return correct number of days', () => {
      const numberOfWeeks = 5;
      const firstDayOfWeek = 1; // Monday
      const result = service.getMonthDaysToShow(numberOfWeeks, firstDayOfWeek);
      expect(result.length).toBe(numberOfWeeks * 7);
    });

    it('should start with the configured first day of week when firstDayOfWeek is Monday (1)', () => {
      const numberOfWeeks = 5;
      const firstDayOfWeek = 1; // Monday

      // Mock the current date to a known value for testing
      const testDate = new Date(2025, 0, 15); // January 15, 2025 (Wednesday)
      jasmine.clock().install();
      jasmine.clock().mockDate(testDate);

      const result = service.getMonthDaysToShow(numberOfWeeks, firstDayOfWeek);

      // January 2025 starts on Wednesday (day 3)
      // With Monday as first day of week, the calendar should start from Dec 30, 2024 (Monday)
      // Parse the date string in local timezone by using the Date constructor with year, month, day
      const [year, month, day] = result[0].split('-').map(Number);
      const firstDayDate = new Date(year, month - 1, day);
      expect(firstDayDate.getDay()).toBe(1); // Monday

      jasmine.clock().uninstall();
    });

    it('should start with the configured first day of week when firstDayOfWeek is Sunday (0)', () => {
      const numberOfWeeks = 5;
      const firstDayOfWeek = 0; // Sunday

      // Mock the current date to a known value for testing
      const testDate = new Date(2025, 0, 15); // January 15, 2025 (Wednesday)
      jasmine.clock().install();
      jasmine.clock().mockDate(testDate);

      const result = service.getMonthDaysToShow(numberOfWeeks, firstDayOfWeek);

      // January 2025 starts on Wednesday (day 3)
      // With Sunday as first day of week, the calendar should start from Dec 29, 2024 (Sunday)
      // Parse the date string in local timezone by using the Date constructor with year, month, day
      const [year, month, day] = result[0].split('-').map(Number);
      const firstDayDate = new Date(year, month - 1, day);
      expect(firstDayDate.getDay()).toBe(0); // Sunday

      jasmine.clock().uninstall();
    });

    it('should start with the configured first day of week when firstDayOfWeek is Saturday (6)', () => {
      const numberOfWeeks = 5;
      const firstDayOfWeek = 6; // Saturday

      // Mock the current date to a known value for testing
      const testDate = new Date(2025, 0, 15); // January 15, 2025 (Wednesday)
      jasmine.clock().install();
      jasmine.clock().mockDate(testDate);

      const result = service.getMonthDaysToShow(numberOfWeeks, firstDayOfWeek);

      // January 2025 starts on Wednesday (day 3)
      // With Saturday as first day of week, the calendar should start from Dec 28, 2024 (Saturday)
      // Parse the date string in local timezone by using the Date constructor with year, month, day
      const [year, month, day] = result[0].split('-').map(Number);
      const firstDayDate = new Date(year, month - 1, day);
      expect(firstDayDate.getDay()).toBe(6); // Saturday

      jasmine.clock().uninstall();
    });

    it('should default to Sunday (0) when no firstDayOfWeek is provided', () => {
      const numberOfWeeks = 5;

      // Mock the current date to a known value for testing
      const testDate = new Date(2025, 0, 15); // January 15, 2025 (Wednesday)
      jasmine.clock().install();
      jasmine.clock().mockDate(testDate);

      const result = service.getMonthDaysToShow(numberOfWeeks);

      // Should default to Sunday as first day
      // Parse the date string in local timezone by using the Date constructor with year, month, day
      const [year, month, day] = result[0].split('-').map(Number);
      const firstDayDate = new Date(year, month - 1, day);
      expect(firstDayDate.getDay()).toBe(0); // Sunday

      jasmine.clock().uninstall();
    });
  });
});
