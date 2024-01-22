import { createSortedBlockerBlocks } from './create-sorted-blocker-blocks';
import { TaskReminderOptionId, TaskWithReminder } from '../../tasks/task.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { TimelineCalendarMapEntry } from '../timeline.model';
import {
  DEFAULT_TASK_REPEAT_CFG,
  TaskRepeatCfg,
} from '../../task-repeat-cfg/task-repeat-cfg.model';
import { getWorklogStr } from '../../../util/get-work-log-str';

const minutes = (n: number): number => n * 60 * 1000;
const hours = (n: number): number => 60 * minutes(n);

const BASE_REMINDER_TASK = (startTime: string, note?: string): any => ({
  timeSpent: 0,
  reminderId: 'xxx',
  plannedAt: getDateTimeFromClockString(startTime, 0),
  title: startTime + ' ' + (note ? note : ' – reminderTask'),
});

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
      },
    ] as any;
    const r = createSortedBlockerBlocks(fakeTasks, [], [], undefined, 0);
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
      },
    ] as any;
    const r = createSortedBlockerBlocks(fakeTasks, [], [], undefined, 0);
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
    const r = createSortedBlockerBlocks(fakeTasks, [], [], undefined, 0);
    expect(r.length).toEqual(1);
    expect(r[0].start).toEqual(getDateTimeFromClockString('15:00', 0));
    expect(r[0].end).toEqual(getDateTimeFromClockString('19:00', 0));
  });

  it('should merge multiple times', () => {
    const fakeTasks: TaskWithReminder[] = [
      {
        ...BASE_REMINDER_TASK('16:00', 'no duration'),
        timeEstimate: 0,
      },
      {
        ...BASE_REMINDER_TASK('17:00'),
        timeEstimate: hours(2),
      },
      {
        ...BASE_REMINDER_TASK('23:00', 'standalone'),
        timeEstimate: hours(1),
      },
      {
        ...BASE_REMINDER_TASK('15:00'),
        timeEstimate: hours(1),
      },
      {
        ...BASE_REMINDER_TASK('15:30'),
        timeEstimate: hours(2.5),
      },
    ] as any;

    const r = createSortedBlockerBlocks(fakeTasks, [], [], undefined, 0);

    expect(r.length).toEqual(2);
    expect(r).toEqual([
      {
        start: getDateTimeFromClockString('15:00', 0),
        end: getDateTimeFromClockString('19:00', 0),
        entries: [
          {
            data: fakeTasks[0],
            end: fakeTasks[0].plannedAt,
            start: fakeTasks[0].plannedAt,
            type: 'ScheduledTask',
          },
          {
            data: fakeTasks[3],
            end: fakeTasks[3].plannedAt + hours(1),
            start: fakeTasks[3].plannedAt,
            type: 'ScheduledTask',
          },
          {
            data: fakeTasks[4],
            end: fakeTasks[4].plannedAt + hours(2.5),
            start: fakeTasks[4].plannedAt,
            type: 'ScheduledTask',
          },
          {
            data: fakeTasks[1],
            end: fakeTasks[1].plannedAt + hours(2),
            start: fakeTasks[1].plannedAt,
            type: 'ScheduledTask',
          },
        ],
      },
      {
        start: getDateTimeFromClockString('23:00', 0),
        end: getDateTimeFromClockString('23:00', 0) + hours(1),
        entries: [
          {
            data: fakeTasks[2],
            end: fakeTasks[2].plannedAt + hours(1),
            start: fakeTasks[2].plannedAt,
            type: 'ScheduledTask',
          },
        ],
      },
    ] as any);
  });

  it('should work with far future entries', () => {
    const fakeTasks: TaskWithReminder[] = [
      {
        ...BASE_REMINDER_TASK('16:00', 'no duration'),
        timeEstimate: 0,
      },
      {
        ...BASE_REMINDER_TASK('17:00'),
        timeEstimate: hours(2),
      },
      {
        ...BASE_REMINDER_TASK('23:00', 'standalone'),
        timeEstimate: hours(1),
      },
      {
        ...BASE_REMINDER_TASK('15:00'),
        timeEstimate: hours(2),
      },
      {
        ...BASE_REMINDER_TASK('15:30', 'TOMORROW'),
        plannedAt: getDateTimeFromClockString('15:30', hours(24)),
        timeEstimate: hours(2.5),
      },
    ] as any;

    const r = createSortedBlockerBlocks(fakeTasks, [], [], undefined, 0);

    expect(r.length).toEqual(3);

    expect(r[0].start).toEqual(getDateTimeFromClockString('15:00', 0));
    expect(r[0].end).toEqual(getDateTimeFromClockString('19:00', 0));
    expect(r[0].entries.length).toEqual(3);

    expect(r[1].start).toEqual(getDateTimeFromClockString('23:00', 0));
    expect(r[1].end).toEqual(getDateTimeFromClockString('23:00', 0) + hours(1));
    expect(r[1].entries.length).toEqual(1);

    expect(r[2].start).toEqual(getDateTimeFromClockString('15:30', hours(24)));
    expect(r[2].end).toEqual(getDateTimeFromClockString('15:30', hours(24)) + hours(2.5));
    expect(r[2].entries.length).toEqual(1);
  });

  it('should work for advanced scenario', () => {
    const fakeTasks: TaskWithReminder[] = [
      {
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
        plannedAt: getDateTimeFromClockString('17:00', new Date(1620048600000)),
        _showSubTasksMode: 2,
        attachments: [],
        issueId: null,
        issuePoints: null,
        issueType: null,
        issueAttachmentNr: null,
        issueLastUpdated: null,
        issueWasUpdated: null,
      },
      {
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
        plannedAt: getDateTimeFromClockString('15:00', new Date(1620048600000)),
        _showSubTasksMode: 2,
        attachments: [],
        issueId: null,
        issuePoints: null,
        issueType: null,
        issueAttachmentNr: null,
        issueLastUpdated: null,
        issueWasUpdated: null,
      },
      {
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
        plannedAt: getDateTimeFromClockString('15:30', new Date(1620048600000)),
        _showSubTasksMode: 2,
        attachments: [],
        issueId: null,
        issuePoints: null,
        issueType: null,
        issueAttachmentNr: null,
        issueLastUpdated: null,
        issueWasUpdated: null,
      },
    ] as any;
    const r = createSortedBlockerBlocks(fakeTasks, [], [], undefined, 0);

    expect(r.length).toEqual(1);
    expect(r[0].start).toEqual(
      getDateTimeFromClockString('15:00', new Date(1620048600000)),
    );
    expect(r[0].end).toEqual(
      getDateTimeFromClockString('19:00', new Date(1620048600000)),
    );
  });

  describe('workStartEnd', () => {
    it('should merge complicated blocks', () => {
      const fakeTasks = [
        {
          id: 'RlHPfiXYk',
          projectId: null,
          subTaskIds: [],
          timeSpentOnDay: { '2021-05-05': 1999 },
          timeSpent: 1999,
          timeEstimate: 0,
          isDone: false,
          doneOn: null,
          title: 'XXX',
          notes: '',
          tagIds: ['TODAY'],
          parentId: null,
          reminderId: 'wctU7fdUV',
          created: 1620239185383,
          repeatCfgId: null,
          plannedAt: getDateTimeFromClockString('23:00', 1620172800000),
          _showSubTasksMode: 2,
          attachments: [],
          issueId: null,
          issuePoints: null,
          issueType: null,
          issueAttachmentNr: null,
          issueLastUpdated: null,
          issueWasUpdated: null,
        },
        {
          id: 'xY44rpnb9',
          projectId: null,
          subTaskIds: [],
          timeSpentOnDay: {},
          timeSpent: 0,
          timeEstimate: 1800000,
          isDone: false,
          doneOn: null,
          title: 'SChed2',
          notes: '',
          tagIds: ['TODAY'],
          parentId: null,
          reminderId: '8ON1WZbSb',
          created: 1620227641668,
          repeatCfgId: null,
          plannedAt: getDateTimeFromClockString('22:00', 1620172800000),
          _showSubTasksMode: 2,
          attachments: [],
          issueId: null,
          issuePoints: null,
          issueType: null,
          issueAttachmentNr: null,
          issueLastUpdated: null,
          issueWasUpdated: null,
        },
        {
          id: 'LayqneCZ0',
          projectId: null,
          subTaskIds: [],
          timeSpentOnDay: {},
          timeSpent: 0,
          timeEstimate: 1800000,
          isDone: false,
          doneOn: null,
          title: 'Sched1',
          notes: '',
          tagIds: ['TODAY'],
          parentId: null,
          reminderId: 'NkonFINlM',
          created: 1620227624280,
          repeatCfgId: null,
          plannedAt: getDateTimeFromClockString('21:00', 1620172800000),
          _showSubTasksMode: 2,
          attachments: [],
          issueId: null,
          issuePoints: null,
          issueType: null,
          issueAttachmentNr: null,
          issueLastUpdated: null,
          issueWasUpdated: null,
        },
      ] as any;

      const r = createSortedBlockerBlocks(
        fakeTasks,
        [],
        [],
        {
          startTime: '9:00',
          endTime: '17:00',
        },
        getDateTimeFromClockString('20:45', 1620172800000),
      );

      expect(r.length).toEqual(30);
      expect(r).toEqual([
        {
          end: getDateTimeFromClockString('09:00', new Date(1620259200000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1620259200000)),
              start: getDateTimeFromClockString('17:00', new Date(1620172800000)),
              type: 'WorkdayStartEnd',
            },
            {
              data: {
                _showSubTasksMode: 2,
                attachments: [],
                created: 1620239185383,
                doneOn: null,
                id: 'RlHPfiXYk',
                isDone: false,
                issueAttachmentNr: null,
                issueId: null,
                issueLastUpdated: null,
                issuePoints: null,
                issueType: null,
                issueWasUpdated: null,
                notes: '',
                parentId: null,
                plannedAt: getDateTimeFromClockString('23:00', new Date(1620172800000)),
                projectId: null,
                reminderId: 'wctU7fdUV',
                repeatCfgId: null,
                subTaskIds: [],
                tagIds: ['TODAY'],
                timeEstimate: 0,
                timeSpent: 1999,
                timeSpentOnDay: { '2021-05-05': 1999 },
                title: 'XXX',
              },
              end: getDateTimeFromClockString('23:00', new Date(1620172800000)),
              start: getDateTimeFromClockString('23:00', new Date(1620172800000)),
              type: 'ScheduledTask',
            },
            {
              data: {
                _showSubTasksMode: 2,
                attachments: [],
                created: 1620227641668,
                doneOn: null,
                id: 'xY44rpnb9',
                isDone: false,
                issueAttachmentNr: null,
                issueId: null,
                issueLastUpdated: null,
                issuePoints: null,
                issueType: null,
                issueWasUpdated: null,
                notes: '',
                parentId: null,
                plannedAt: getDateTimeFromClockString('22:00', new Date(1620172800000)),
                projectId: null,
                reminderId: '8ON1WZbSb',
                repeatCfgId: null,
                subTaskIds: [],
                tagIds: ['TODAY'],
                timeEstimate: 1800000,
                timeSpent: 0,
                timeSpentOnDay: {},
                title: 'SChed2',
              },
              end: getDateTimeFromClockString('22:30', new Date(1620172800000)),
              start: getDateTimeFromClockString('22:00', new Date(1620172800000)),
              type: 'ScheduledTask',
            },
            {
              data: {
                _showSubTasksMode: 2,
                attachments: [],
                created: 1620227624280,
                doneOn: null,
                id: 'LayqneCZ0',
                isDone: false,
                issueAttachmentNr: null,
                issueId: null,
                issueLastUpdated: null,
                issuePoints: null,
                issueType: null,
                issueWasUpdated: null,
                notes: '',
                parentId: null,
                plannedAt: getDateTimeFromClockString('21:00', new Date(1620172800000)),
                projectId: null,
                reminderId: 'NkonFINlM',
                repeatCfgId: null,
                subTaskIds: [],
                tagIds: ['TODAY'],
                timeEstimate: 1800000,
                timeSpent: 0,
                timeSpentOnDay: {},
                title: 'Sched1',
              },
              end: getDateTimeFromClockString('21:30', new Date(1620172800000)),
              start: getDateTimeFromClockString('21:00', new Date(1620172800000)),
              type: 'ScheduledTask',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1620172800000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1620345600000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1620345600000)),
              start: getDateTimeFromClockString('17:00', new Date(1620259200000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1620259200000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1620432000000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1620432000000)),
              start: getDateTimeFromClockString('17:00', new Date(1620345600000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1620345600000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1620518400000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1620518400000)),
              start: getDateTimeFromClockString('17:00', new Date(1620432000000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1620432000000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1620604800000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1620604800000)),
              start: getDateTimeFromClockString('17:00', new Date(1620518400000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1620518400000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1620691200000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1620691200000)),
              start: getDateTimeFromClockString('17:00', new Date(1620604800000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1620604800000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1620777600000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1620777600000)),
              start: getDateTimeFromClockString('17:00', new Date(1620691200000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1620691200000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1620864000000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1620864000000)),
              start: getDateTimeFromClockString('17:00', new Date(1620777600000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1620777600000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1620950400000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1620950400000)),
              start: getDateTimeFromClockString('17:00', new Date(1620864000000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1620864000000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621036800000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621036800000)),
              start: getDateTimeFromClockString('17:00', new Date(1620950400000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1620950400000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621123200000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621123200000)),
              start: getDateTimeFromClockString('17:00', new Date(1621036800000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621036800000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621209600000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621209600000)),
              start: getDateTimeFromClockString('17:00', new Date(1621123200000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621123200000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621296000000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621296000000)),
              start: getDateTimeFromClockString('17:00', new Date(1621209600000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621209600000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621382400000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621382400000)),
              start: getDateTimeFromClockString('17:00', new Date(1621296000000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621296000000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621468800000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621468800000)),
              start: getDateTimeFromClockString('17:00', new Date(1621382400000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621382400000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621555200000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621555200000)),
              start: getDateTimeFromClockString('17:00', new Date(1621468800000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621468800000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621641600000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621641600000)),
              start: getDateTimeFromClockString('17:00', new Date(1621555200000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621555200000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621728000000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621728000000)),
              start: getDateTimeFromClockString('17:00', new Date(1621641600000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621641600000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621814400000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621814400000)),
              start: getDateTimeFromClockString('17:00', new Date(1621728000000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621728000000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621900800000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621900800000)),
              start: getDateTimeFromClockString('17:00', new Date(1621814400000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621814400000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1621987200000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1621987200000)),
              start: getDateTimeFromClockString('17:00', new Date(1621900800000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621900800000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1622073600000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1622073600000)),
              start: getDateTimeFromClockString('17:00', new Date(1621987200000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1621987200000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1622160000000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1622160000000)),
              start: getDateTimeFromClockString('17:00', new Date(1622073600000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1622073600000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1622246400000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1622246400000)),
              start: getDateTimeFromClockString('17:00', new Date(1622160000000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1622160000000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1622332800000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1622332800000)),
              start: getDateTimeFromClockString('17:00', new Date(1622246400000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1622246400000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1622419200000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1622419200000)),
              start: getDateTimeFromClockString('17:00', new Date(1622332800000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1622332800000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1622505600000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1622505600000)),
              start: getDateTimeFromClockString('17:00', new Date(1622419200000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1622419200000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1622592000000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1622592000000)),
              start: getDateTimeFromClockString('17:00', new Date(1622505600000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1622505600000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1622678400000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1622678400000)),
              start: getDateTimeFromClockString('17:00', new Date(1622592000000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1622592000000)),
        },
        {
          end: getDateTimeFromClockString('09:00', new Date(1622764800000)),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: getDateTimeFromClockString('09:00', new Date(1622764800000)),
              start: getDateTimeFromClockString('17:00', new Date(1622678400000)),
              type: 'WorkdayStartEnd',
            },
          ],
          start: getDateTimeFromClockString('17:00', new Date(1622678400000)),
        },
      ] as any);
    });
  });

  describe('repeatTaskProjections', () => {
    const DUMMY_REPEATABLE_TASK: TaskRepeatCfg = {
      ...DEFAULT_TASK_REPEAT_CFG,
      id: 'REPEATABLE_DEFAULT',
      title: 'REPEATABLE_DEFAULT',
      quickSetting: 'DAILY',
      lastTaskCreation: 60 * 60 * 1000,
      defaultEstimate: undefined,
      notes: undefined,
      projectId: null,
      startTime: undefined,
      remindAt: undefined,
      isPaused: false,
      repeatCycle: 'WEEKLY',
      startDate: getWorklogStr(new Date(0)),
      repeatEvery: 1,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
      tagIds: [],
      order: 0,
    };

    it('should work for a scheduled repeatable task', () => {
      const fakeRepeatTaskCfgs: TaskRepeatCfg[] = [
        {
          ...DUMMY_REPEATABLE_TASK,
          id: 'R1',
          startTime: '10:00',
          defaultEstimate: hours(1),
          friday: true,
          remindAt: TaskReminderOptionId.AtStart,
        },
      ];
      const r = createSortedBlockerBlocks([], fakeRepeatTaskCfgs, [], undefined, 0);
      expect(r.length).toEqual(5);
      expect(r[0].start).toEqual(
        getDateTimeFromClockString('10:00', 24 * 60 * 60 * 1000),
      );
      expect(r[0].end).toEqual(getDateTimeFromClockString('11:00', 24 * 60 * 60 * 1000));
    });

    it('should work for different types of repeatable tasks', () => {
      const fakeRepeatTaskCfgs: TaskRepeatCfg[] = [
        {
          ...DUMMY_REPEATABLE_TASK,
          id: 'R1',
          title: 'Repeat 1',
          startTime: '10:00',
          defaultEstimate: hours(1),
          sunday: true,
        },
        {
          ...DUMMY_REPEATABLE_TASK,
          id: 'R2',
          title: 'Repeat 2',
          startTime: '14:00',
          lastTaskCreation: getDateTimeFromClockString('22:20', 0),
          defaultEstimate: hours(1),
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
        },
        {
          ...DUMMY_REPEATABLE_TASK,
          id: 'R3',
          title: 'Repeat 3 No Time',
          startTime: '10:00',
          defaultEstimate: hours(1),
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
        },
      ];
      const r = createSortedBlockerBlocks([], fakeRepeatTaskCfgs, [], undefined, 0);
      expect(r.length).toEqual(58);
      expect(r[2].start).toEqual(205200000);
      expect(r[2].end).toEqual(208800000);
      expect(r[2].entries.length).toEqual(1);
      expect(r[4].entries.length).toEqual(2);
    });

    it('should work for DAILY repeatable tasks', () => {
      const fakeRepeatTaskCfgs: TaskRepeatCfg[] = [
        {
          ...DUMMY_REPEATABLE_TASK,
          id: 'R1',
          startTime: '10:00',
          defaultEstimate: hours(1),
          repeatCycle: 'DAILY',
        },
      ];
      const r = createSortedBlockerBlocks([], fakeRepeatTaskCfgs, [], undefined, 0);
      expect(r.length).toEqual(29);
      expect(r[0].start).toEqual(
        getDateTimeFromClockString('10:00', 24 * 60 * 60 * 1000),
      );
      expect(r[0].end).toEqual(getDateTimeFromClockString('11:00', 24 * 60 * 60 * 1000));
      expect(r[28].start).toEqual(
        getDateTimeFromClockString('10:00', 29 * 24 * 60 * 60 * 1000),
      );
      expect(r[28].end).toEqual(
        getDateTimeFromClockString('11:00', 29 * 24 * 60 * 60 * 1000),
      );
    });
  });

  describe('icalEventMap', () => {
    it('should work for calendar events', () => {
      const icalEventMap: TimelineCalendarMapEntry[] = [
        {
          icon: '',
          items: [
            {
              id: 'EventId',
              start: getDateTimeFromClockString('10:00', 24 * 60 * 60 * 1000),
              title: 'XXX',
              icon: 'aaa',
              duration: hours(1),
            },
          ],
        },
      ];
      const fakeTasks: TaskWithReminder[] = [
        {
          id: 'S1',
          timeSpent: 0,
          timeEstimate: hours(2),
          title: 'Scheduled 1 15:00',
          reminderId: 'rhCi_JJyP',
          plannedAt: getDateTimeFromClockString('9:20', 0),
        },
      ] as any;
      const r = createSortedBlockerBlocks(fakeTasks, [], icalEventMap, undefined, 0);
      expect(r).toEqual([
        {
          end: 37200000,
          entries: [
            {
              data: {
                id: 'S1',
                plannedAt: 30000000,
                reminderId: 'rhCi_JJyP',
                timeEstimate: 7200000,
                timeSpent: 0,
                title: 'Scheduled 1 15:00',
              },
              end: 37200000,
              start: 30000000,
              type: 'ScheduledTask',
            },
          ],
          start: 30000000,
        },
        {
          end: 122400000,
          entries: [
            {
              data: {
                duration: 3600000,
                icon: '',
                start: 118800000,
                title: 'XXX',
                id: 'EventId',
              },
              end: 122400000,
              start: 118800000,
              type: 'CalendarEvent',
            },
          ],
          start: 118800000,
        },
      ] as any);
    });
  });
});
