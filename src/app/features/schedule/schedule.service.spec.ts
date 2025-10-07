import { TestBed } from '@angular/core/testing';
import { ScheduleService } from './schedule.service';
import { DateService } from '../../core/date/date.service';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let dateService: DateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ScheduleService, DateService],
    });
    service = TestBed.inject(ScheduleService);
    dateService = TestBed.inject(DateService);
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
      // With Monday as first day of week, the calendar should start from Dec 29, 2024 (Monday)
      const firstDayDate = new Date(result[0]);
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
      // With Sunday as first day of week, the calendar should start from Dec 28, 2024 (Sunday)
      const firstDayDate = new Date(result[0]);
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
      // With Saturday as first day of week, the calendar should start from Dec 27, 2024 (Saturday)
      const firstDayDate = new Date(result[0]);
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
      const firstDayDate = new Date(result[0]);
      expect(firstDayDate.getDay()).toBe(0); // Sunday

      jasmine.clock().uninstall();
    });
  });
});
