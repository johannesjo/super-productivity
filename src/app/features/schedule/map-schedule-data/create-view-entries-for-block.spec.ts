import { createViewEntriesForBlock } from './create-view-entries-for-block';
import { TaskPlanned } from '../../tasks/task.model';
import { SVEType } from '../schedule.const';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { BlockedBlockType } from '../schedule.model';

const ESA: string[] = [];

describe('createViewEntriesForBlock()', () => {
  it('should work for empty case', () => {
    const r = createViewEntriesForBlock({ entries: [], start: 0, end: 0 }, 'DD');
    expect(r).toEqual([]);
  });

  it('should work for minimal case', () => {
    const r = createViewEntriesForBlock(
      {
        entries: [
          {
            start: 0,
            end: 1000,
            type: BlockedBlockType.ScheduledTask,
            data: {
              id: '1',
              plannedAt: 0,
              timeSpent: 0,
              subTaskIds: ESA,
              tagIds: ESA,
              timeEstimate: 1000,
            } as TaskPlanned,
          },
        ],
        start: 0,
        end: 1000,
      },
      'DD',
    );
    expect(r).toEqual([
      {
        data: {
          id: '1',
          plannedAt: 0,
          subTaskIds: ESA,
          tagIds: ESA,
          timeEstimate: 1000,
          timeSpent: 0,
        } as TaskPlanned,
        id: '1',
        start: 0,
        duration: 1000,
        type: SVEType.ScheduledTask,
      },
    ]);
  });

  it('should work for all case', () => {
    const r = createViewEntriesForBlock(
      {
        entries: [
          {
            start: 0,
            end: 1000,
            type: BlockedBlockType.ScheduledTask,
            data: {
              id: '1',
              plannedAt: 0,
              timeSpent: 0,
              subTaskIds: ESA,
              tagIds: ESA,
              timeEstimate: 1000,
            } as TaskPlanned,
          },
          {
            start: 1000,
            end: 2000,
            type: BlockedBlockType.ScheduledRepeatProjection,
            data: {
              id: '2',
              defaultEstimate: 2000,
            } as TaskRepeatCfg,
          },
          {
            start: 1000,
            end: 5000,
            type: BlockedBlockType.LunchBreak,
            data: {
              startTime: '9:00',
              endTime: '10:00',
            },
          },
          {
            start: 2000,
            end: 5000,
            type: BlockedBlockType.CalendarEvent,
            data: {
              id: 'calEvId1',
              calProviderId: 'calProvId1',
              title: 'Title',
              duration: 3000,
              start: 2000,
            },
          },
        ],
        start: 0,
        end: 5000,
      },
      'DD',
    );
    expect(r).toEqual([
      {
        data: {
          id: '1',
          plannedAt: 0,
          subTaskIds: ESA,
          tagIds: ESA,
          timeEstimate: 1000,
          timeSpent: 0,
        } as TaskPlanned,
        id: '1',
        start: 0,
        duration: 1000,
        type: SVEType.ScheduledTask,
      },
      {
        data: { defaultEstimate: 2000, id: '2' },
        id: '2_DD',
        start: 1000,
        duration: 2000,
        type: 'ScheduledRepeatProjection',
      },
      {
        data: { endTime: '10:00', startTime: '9:00' },
        id: 'LUNCH_BREAK_DD',
        start: 1000,
        duration: 4000,
        type: 'LunchBreak',
      },
      {
        data: {
          calProviderId: 'calProvId1',
          duration: 3000,
          icon: 'event',
          id: 'calEvId1',
          start: 2000,
          title: 'Title',
        },
        id: 'calEvId1_DD',
        start: 2000,
        duration: 3000,
        type: 'CalendarEvent',
      },
    ] as any);
  });
});
