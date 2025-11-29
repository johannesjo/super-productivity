import { TestBed } from '@angular/core/testing';
import { DateTimeFormatService } from './date-time-format.service';
import { provideMockStore } from '@ngrx/store/testing';
import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';
import { DateAdapter } from '@angular/material/core';
import { DEFAULT_FIRST_DAY_OF_WEEK } from 'src/app/core/locale.constants';

describe('DateTimeFormatService', () => {
  let service: DateTimeFormatService;

  beforeEach(() => {
    const dateAdapter = jasmine.createSpyObj<DateAdapter<Date>>('DateAdapter', [], {
      getFirstDayOfWeek: () => DEFAULT_FIRST_DAY_OF_WEEK,
    });

    TestBed.configureTestingModule({
      providers: [
        DateTimeFormatService,
        provideMockStore({
          initialState: {
            globalConfig: DEFAULT_GLOBAL_CONFIG,
          },
        }),
        { provide: DateAdapter, useValue: dateAdapter },
      ],
    });
    service = TestBed.inject(DateTimeFormatService);
  });

  it('should use system locale by default', () => {
    // By default, timeLocale should be undefined (system default)
    const testTime = new Date(2024, 0, 15, 14, 30).getTime();
    const formatted = service.formatTime(testTime);

    // Should produce a valid time string
    expect(formatted).toBeTruthy();
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('should detect 24-hour format for appropriate locales', () => {
    // When no locale is set, is24HourFormat should work with system default
    const is24Hour = service.is24HourFormat();
    expect(typeof is24Hour).toBe('boolean');
  });

  it('should maintain consistent behavior', () => {
    // Test that multiple calls return the same format detection
    const firstCheck = service.is24HourFormat();
    const secondCheck = service.is24HourFormat();
    expect(firstCheck).toBe(secondCheck);

    // Test that formatTime produces consistent output
    const testTime = new Date(2024, 0, 15, 14, 30).getTime();
    const formatted1 = service.formatTime(testTime);
    const formatted2 = service.formatTime(testTime);
    expect(formatted1).toBe(formatted2);
  });
});
