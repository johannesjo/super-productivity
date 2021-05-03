import { createBlockerBlocks } from './create-blocker-blocks';
import { TaskWithReminder } from '../../tasks/task.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';

const minutes = (n: number): number => n * 60 * 1000;
const hours = (n: number): number => 60 * minutes(n);

describe('createBlockerBlocks()', () => {
  it('should merge into single block if all overlapping', () => {
    const fakeTasks: TaskWithReminder[] = [
      {
        id: 'S1',
        timeSpent: 0,
        timeEstimate: hours(2),
        title: 'Scheduled 1 15:00',
        reminderId: 'rhCi_JJyP',
        plannedAt: getDateTimeFromClockString('9:20', 0),
      },
      {
        id: 'S3',
        timeSpent: 0,
        timeEstimate: hours(3),
        title: 'Scheduled 3 17:00',
        reminderId: 'FeKPSsB_L',
        plannedAt: getDateTimeFromClockString('10:20', 0),
      },
      {
        id: 'S2',
        timeSpent: 0,
        timeEstimate: hours(2),
        title: 'Scheduled 2 15:30',
        reminderId: 'xlg47DKt6',
        plannedAt: getDateTimeFromClockString('12:30', 0),
      }
    ] as any;
    const r = createBlockerBlocks(fakeTasks);
    expect(r.length).toEqual(1);
    expect(r[0].start).toEqual(getDateTimeFromClockString('9:20', 0));
    expect(r[0].end).toEqual(getDateTimeFromClockString('14:30', 0));
  });

  it('should merge into multiple blocks if not overlapping', () => {
    const fakeTasks: TaskWithReminder[] = [
      {
        id: 'S1',
        timeSpent: 0,
        timeEstimate: hours(2),
        title: 'Scheduled 1 15:00',
        reminderId: 'rhCi_JJyP',
        plannedAt: getDateTimeFromClockString('9:20', 0),
      },
      {
        id: 'S3',
        timeSpent: 0,
        timeEstimate: hours(3),
        title: 'Scheduled 3 17:00',
        reminderId: 'FeKPSsB_L',
        plannedAt: getDateTimeFromClockString('10:20', 0),
      },
      {
        id: 'S2',
        timeSpent: 0,
        timeEstimate: hours(1),
        title: 'Scheduled 2 15:30',
        reminderId: 'xlg47DKt6',
        plannedAt: getDateTimeFromClockString('12:30', 0),
      },
      {
        id: 'S2',
        timeSpent: 0,
        timeEstimate: hours(2),
        title: 'Scheduled 2 15:30',
        reminderId: 'xlg47DKt6',
        plannedAt: getDateTimeFromClockString('12:00', 0),
      },
      {
        id: 'S4',
        timeSpent: 0,
        timeEstimate: hours(2),
        title: 'Scheduled 2 17:30',
        reminderId: 'xlg47DKt6',
        plannedAt: getDateTimeFromClockString('17:30', 0),
      }
    ] as any;
    const r = createBlockerBlocks(fakeTasks);
    expect(r.length).toEqual(2);
    expect(r[0].start).toEqual(getDateTimeFromClockString('9:20', 0));
    expect(r[0].end).toEqual(getDateTimeFromClockString('14:00', 0));

    expect(r[1].start).toEqual(getDateTimeFromClockString('17:30', 0));
    expect(r[1].end).toEqual(getDateTimeFromClockString('19:30', 0));
  });
});
