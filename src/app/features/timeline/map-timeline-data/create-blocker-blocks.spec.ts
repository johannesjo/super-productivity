import { createSortedBlockerBlocks } from './create-sorted-blocker-blocks';
import { TaskReminderOptionId, TaskWithReminder } from '../../tasks/task.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';

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
    const r = createSortedBlockerBlocks(fakeTasks, [], undefined, 0);
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
    const r = createSortedBlockerBlocks(fakeTasks, [], undefined, 0);
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
    const r = createSortedBlockerBlocks(fakeTasks, [], undefined, 0);
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

    const r = createSortedBlockerBlocks(fakeTasks, [], undefined, 0);

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

    const r = createSortedBlockerBlocks(fakeTasks, [], undefined, 0);

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
        plannedAt: 1620054000000,
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
        plannedAt: 1620046800000,
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
        plannedAt: 1620048600000,
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
    const r = createSortedBlockerBlocks(fakeTasks, [], undefined, 0);

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
          plannedAt: 1620248400000,
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
          plannedAt: 1620244800000,
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
          plannedAt: 1620241200000,
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
        {
          startTime: '9:00',
          endTime: '17:00',
        },
        1620240317297,
      );

      expect(r.length).toEqual(30);
      expect(r).toEqual([
        {
          end: 1620284400000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1620284400000,
              start: 1620226800000,
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
                plannedAt: 1620248400000,
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
              end: 1620248400000,
              start: 1620248400000,
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
                plannedAt: 1620244800000,
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
              end: 1620246600000,
              start: 1620244800000,
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
                plannedAt: 1620241200000,
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
              end: 1620243000000,
              start: 1620241200000,
              type: 'ScheduledTask',
            },
          ],
          start: 1620226800000,
        },
        {
          end: 1620370800000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1620370800000,
              start: 1620313200000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1620313200000,
        },
        {
          end: 1620457200000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1620457200000,
              start: 1620399600000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1620399600000,
        },
        {
          end: 1620543600000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1620543600000,
              start: 1620486000000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1620486000000,
        },
        {
          end: 1620630000000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1620630000000,
              start: 1620572400000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1620572400000,
        },
        {
          end: 1620716400000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1620716400000,
              start: 1620658800000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1620658800000,
        },
        {
          end: 1620802800000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1620802800000,
              start: 1620745200000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1620745200000,
        },
        {
          end: 1620889200000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1620889200000,
              start: 1620831600000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1620831600000,
        },
        {
          end: 1620975600000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1620975600000,
              start: 1620918000000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1620918000000,
        },
        {
          end: 1621062000000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621062000000,
              start: 1621004400000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621004400000,
        },
        {
          end: 1621148400000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621148400000,
              start: 1621090800000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621090800000,
        },
        {
          end: 1621234800000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621234800000,
              start: 1621177200000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621177200000,
        },
        {
          end: 1621321200000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621321200000,
              start: 1621263600000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621263600000,
        },
        {
          end: 1621407600000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621407600000,
              start: 1621350000000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621350000000,
        },
        {
          end: 1621494000000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621494000000,
              start: 1621436400000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621436400000,
        },
        {
          end: 1621580400000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621580400000,
              start: 1621522800000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621522800000,
        },
        {
          end: 1621666800000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621666800000,
              start: 1621609200000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621609200000,
        },
        {
          end: 1621753200000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621753200000,
              start: 1621695600000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621695600000,
        },
        {
          end: 1621839600000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621839600000,
              start: 1621782000000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621782000000,
        },
        {
          end: 1621926000000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1621926000000,
              start: 1621868400000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621868400000,
        },
        {
          end: 1622012400000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1622012400000,
              start: 1621954800000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1621954800000,
        },
        {
          end: 1622098800000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1622098800000,
              start: 1622041200000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1622041200000,
        },
        {
          end: 1622185200000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1622185200000,
              start: 1622127600000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1622127600000,
        },
        {
          end: 1622271600000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1622271600000,
              start: 1622214000000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1622214000000,
        },
        {
          end: 1622358000000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1622358000000,
              start: 1622300400000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1622300400000,
        },
        {
          end: 1622444400000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1622444400000,
              start: 1622386800000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1622386800000,
        },
        {
          end: 1622530800000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1622530800000,
              start: 1622473200000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1622473200000,
        },
        {
          end: 1622617200000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1622617200000,
              start: 1622559600000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1622559600000,
        },
        {
          end: 1622703600000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1622703600000,
              start: 1622646000000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1622646000000,
        },
        {
          end: 1622790000000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 1622790000000,
              start: 1622732400000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 1622732400000,
        },
      ] as any);
    });
  });

  describe('repeatTaskProjections', () => {
    it('should work for a scheduled repeatable task', () => {
      const fakeRepeatTaskCfgs: TaskRepeatCfg[] = [
        {
          id: 'R1',
          title: 'Repeat 1 15:00',
          startTime: '10:00',
          lastTaskCreation: 0,
          defaultEstimate: hours(1),
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: true,
          saturday: false,
          sunday: false,

          projectId: null,
          remindAt: TaskReminderOptionId.AtStart,
          isAddToBottom: true,
          tagIds: [],
        },
      ];
      const r = createSortedBlockerBlocks([], fakeRepeatTaskCfgs, undefined, 0);
      expect(r.length).toEqual(5);
      expect(r[0].start).toEqual(
        getDateTimeFromClockString('10:00', 24 * 60 * 60 * 1000),
      );
      expect(r[0].end).toEqual(getDateTimeFromClockString('11:00', 24 * 60 * 60 * 1000));
    });

    it('should work for different types of repeatable tasks', () => {
      const fakeRepeatTaskCfgs: TaskRepeatCfg[] = [
        {
          id: 'R1',
          title: 'Repeat 1',
          projectId: null,
          startTime: '10:00',
          lastTaskCreation: 0,
          defaultEstimate: hours(1),
          remindAt: TaskReminderOptionId.AtStart,
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: true,
          isAddToBottom: true,
          tagIds: [],
        },
        {
          id: 'R2',
          title: 'Repeat 2',
          projectId: null,
          startTime: '14:00',
          lastTaskCreation: getDateTimeFromClockString('22:20', 0),
          defaultEstimate: hours(1),
          remindAt: TaskReminderOptionId.AtStart,
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
          isAddToBottom: true,
          tagIds: [],
        },
        {
          id: 'R3',
          title: 'Repeat 3 No Time',
          projectId: null,
          startTime: '10:00',
          lastTaskCreation: 0,
          defaultEstimate: hours(1),
          remindAt: TaskReminderOptionId.AtStart,
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
          isAddToBottom: true,
          tagIds: [],
        },
      ];
      const r = createSortedBlockerBlocks([], fakeRepeatTaskCfgs, undefined, 0);
      expect(r.length).toEqual(58);
      expect(r[2].start).toEqual(205200000);
      expect(r[2].end).toEqual(208800000);
      expect(r[2].entries.length).toEqual(1);
      expect(r[4].entries.length).toEqual(2);
    });
  });
});
