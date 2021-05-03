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

  it('should work for advanced scenario', () => {
    const fakeTasks: TaskWithReminder[] = [
      {
        id: 'S1',
        timeSpent: 0,
        timeEstimate: hours(1),
        title: 'Scheduled 1 15:00',
        reminderId: 'xxx',
        plannedAt: getDateTimeFromClockString('15:00', 0),
      },
      {
        id: 'S2',
        timeSpent: 0,
        timeEstimate: minutes(185),
        title: 'Scheduled 2 15:30',
        reminderId: 'xxx',
        plannedAt: getDateTimeFromClockString('15:30', 0),
      },
      {
        id: 'S3',
        timeSpent: 0,
        timeEstimate: hours(2),
        title: 'Scheduled 3 17:00',
        reminderId: 'xxx',
        plannedAt: getDateTimeFromClockString('17:00', 0),
      },
    ] as any;
    const r = createBlockerBlocks(fakeTasks);
    expect(r.length).toEqual(1);
    expect(r[0].start).toEqual(getDateTimeFromClockString('15:00', 0));
    expect(r[0].end).toEqual(getDateTimeFromClockString('19:00', 0));
  });

  it('should work for advanced scenario', () => {
    const fakeTasks: TaskWithReminder[] = [{
      id: '0LtuSnH8s',
      projectId: null,
      subTaskIds: [],
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 7200000,
      isDone: false,
      doneOn: null,
      title: 'Scheduled 3 17:00',
      notes: '',
      tagIds: ['TODAY'],
      parentId: null,
      reminderId: 'FeKPSsB_L',
      created: 1620028156706,
      repeatCfgId: null,
      plannedAt: 1620054000000,
      _showSubTasksMode: 2,
      attachments: [],
      issueId: null,
      issuePoints: null,
      issueType: null,
      issueAttachmentNr: null,
      issueLastUpdated: null,
      issueWasUpdated: null
    }, {
      id: '68K0kYJ2s',
      projectId: null,
      subTaskIds: [],
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 3600000,
      isDone: false,
      doneOn: null,
      title: 'Scheduled 1 15:00',
      notes: '',
      tagIds: ['TODAY'],
      parentId: null,
      reminderId: 'rhCi_JJyP',
      created: 1619985034709,
      repeatCfgId: null,
      plannedAt: 1620046800000,
      _showSubTasksMode: 2,
      attachments: [],
      issueId: null,
      issuePoints: null,
      issueType: null,
      issueAttachmentNr: null,
      issueLastUpdated: null,
      issueWasUpdated: null
    }, {
      id: '9JTnZa-VW',
      projectId: null,
      subTaskIds: [],
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 9000000,
      isDone: false,
      doneOn: null,
      title: 'Scheduled 2 15:30',
      notes: '',
      tagIds: ['TODAY'],
      parentId: null,
      reminderId: 'xlg47DKt6',
      created: 1620027763328,
      repeatCfgId: null,
      plannedAt: 1620048600000,
      _showSubTasksMode: 2,
      attachments: [],
      issueId: null,
      issuePoints: null,
      issueType: null,
      issueAttachmentNr: null,
      issueLastUpdated: null,
      issueWasUpdated: null
    }] as any;
    const r = createBlockerBlocks(fakeTasks);
    console.log(r);

    expect(r.length).toEqual(1);
    expect(r[0].start).toEqual(getDateTimeFromClockString('15:00', new Date(1620048600000)));
    expect(r[0].end).toEqual(getDateTimeFromClockString('19:00', new Date(1620048600000)));
  });
});
