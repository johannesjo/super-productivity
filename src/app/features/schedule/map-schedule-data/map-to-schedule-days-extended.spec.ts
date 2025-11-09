import { mapToScheduleDays } from './map-to-schedule-days';
import { getDbDateStr } from '../../../util/get-db-date-str';

/* eslint-disable @typescript-eslint/naming-convention */

// Helper function to conditionally skip tests that are timezone-dependent
// These tests were written with hardcoded expectations for Europe/Berlin timezone
const TZ_OFFSET = new Date('1970-01-01').getTimezoneOffset() * 60000;
const isEuropeBerlinTimezone = (): boolean => TZ_OFFSET === -3600000; // UTC+1 = -1 hour offset
const maybeSkipTimezoneDependent = (testName: string): boolean => {
  if (!isEuropeBerlinTimezone()) {
    console.warn(
      `Skipping timezone-dependent test "${testName}" - only runs in Europe/Berlin timezone`,
    );
    return true;
  }
  return false;
};

describe('mapToScheduleDays()', () => {
  it('should work for scheduled repeats that neighbor workStart workEnd blocks', () => {
    if (
      maybeSkipTimezoneDependent(
        'should work for scheduled repeats that neighbor workStart workEnd blocks',
      )
    ) {
      pending('Skipping timezone-dependent test');
      return;
    }
    const p = {
      now: 1722621940151,
      dayDates: ['2024-08-02', '2024-08-03', '2024-08-04', '2024-08-05', '2024-08-06'],
      scheduledTaskRepeatCfgs: [
        {
          lastTaskCreationDay: getDbDateStr(1722325722970),
          title: 'Do something scheduled on a regular basis',
          defaultEstimate: 900000,
          projectId: 'lMLlW2yO',
          startTime: '9:00',
          remindAt: 'AtStart',
          isPaused: false,
          quickSetting: 'CUSTOM',
          tagIds: ['TODAY'],
          order: 0,
          repeatEvery: 1,
          repeatCycle: 'WEEKLY',
          startDate: '2024-07-30',
          monday: true,
          id: 'wSs2q4YWkZZjthJrUeIos',
        },
      ],
      unScheduledTaskRepeatCfgs: [
        {
          lastTaskCreationDay: getDbDateStr(1722275904553),
          title: 'Plan Week',
          defaultEstimate: 1800000,
          projectId: 'lMLlW2yO',
          startDate: '2024-05-06',
          repeatEvery: 1,
          isPaused: false,
          quickSetting: 'WEEKLY_CURRENT_WEEKDAY',
          repeatCycle: 'WEEKLY',
          monday: true,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
          tagIds: ['TODAY'],
          order: 0,
          id: 'lmjFQzTdJh8aSak3cu9SN',
        },
        {
          lastTaskCreationDay: getDbDateStr(1722617221091),
          title: 'Also scheduled in the morning',
          defaultEstimate: 1200000,
          projectId: 'DEFAULT',
          startDate: '2024-07-30',
          repeatEvery: 1,
          isPaused: false,
          quickSetting: 'MONDAY_TO_FRIDAY',
          repeatCycle: 'WEEKLY',
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
          tagIds: ['TODAY', 'DZHev64ka8kt4olVAujAe'],
          order: 32,
          id: 'Foclw2saS0jZ3LfLVM5fd',
        },
        {
          lastTaskCreationDay: getDbDateStr(1722617221091),
          title: 'Yap about my daily plans on mastodon',
          defaultEstimate: 300000,
          projectId: 'DEFAULT',
          startDate: '2024-07-27',
          repeatEvery: 1,
          isPaused: false,
          quickSetting: 'MONDAY_TO_FRIDAY',
          repeatCycle: 'WEEKLY',
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
          tagIds: ['TODAY'],
          order: 0,
          id: 'QRZ1qaGbKJSO-1-RoIh7F',
        },
      ],
      workStartEndCfg: { startTime: '9:00', endTime: '17:00' },
      lunchBreakCfg: { startTime: '11:00', endTime: '11:30' },
    };

    const r = mapToScheduleDays(
      1722622968021,
      p.dayDates,
      [],
      [],
      p.scheduledTaskRepeatCfgs as any,
      p.unScheduledTaskRepeatCfgs as any,
      [],
      null,
      {},
      {
        isWorkStartEndEnabled: true,
        workStart: '9:00',
        workEnd: '17:00',
        isLunchBreakEnabled: true,
        lunchBreakStart: '11:00',
        lunchBreakEnd: '11:30',
        isAllowTaskSplitting: true,
        taskPlacementStrategy: 'DEFAULT',
      } as any,
      p.workStartEndCfg as any,
      p.lunchBreakCfg as any,
    );

    expect(r[3].dayDate).toBe('2024-08-05');
    expect(r[3].beyondBudgetTasks).toEqual([]);
    expect(r[3].entries.length).toBe(5); // 4 tasks + 1 lunch break

    // Verify the scheduled repeat task at 9:00
    expect(r[3].entries[0].id).toBe('wSs2q4YWkZZjthJrUeIos_2024-08-05');
    expect(r[3].entries[0].type).toBe('ScheduledRepeatProjection');
    expect(r[3].entries[0].start).toBe(1722841200000);

    // Verify unscheduled repeat tasks
    expect(r[3].entries[1].id).toBe('lmjFQzTdJh8aSak3cu9SN_2024-08-05');
    expect(r[3].entries[1].type).toBe('RepeatProjection');

    expect(r[3].entries[2].id).toBe('Foclw2saS0jZ3LfLVM5fd_2024-08-05');
    expect(r[3].entries[2].type).toBe('RepeatProjection');

    expect(r[3].entries[3].id).toBe('QRZ1qaGbKJSO-1-RoIh7F_2024-08-05');
    expect(r[3].entries[3].type).toBe('RepeatProjection');

    // Verify lunch break appears as the 5th entry
    expect(r[3].entries[4].id).toBe('LUNCH_BREAK_2024-08-05');
    expect(r[3].entries[4].type).toBe('LunchBreak');
    expect(r[3].entries[4].start).toBe(1722848400000); // 11:00
    expect(r[3].isToday).toBe(false);
  });
});
