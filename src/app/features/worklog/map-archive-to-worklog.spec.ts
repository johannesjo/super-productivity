import {arrayToDictionary} from '../../util/array-to-dictionary';
import {DEFAULT_TASK, Task, TaskCopy, TaskState} from '../tasks/task.model';
import {mapArchiveToWorklog} from './map-archive-to-worklog';
import {Dictionary, EntityState} from '@ngrx/entity';
import {Worklog} from './worklog.model';

const START_END_ALL = {
  workStart: {
    '1200-05-05': 10713600000,
  },
  workEnd: {
    '2022-05-08': 1651968000000
  }
};

const fakeTaskStateFromArray = (tasks: TaskCopy[]): EntityState<Task> => {
  const dict = arrayToDictionary(tasks) as Dictionary<TaskCopy>;
  return {
    entities: dict,
    ids: Object.keys(dict),
  } as EntityState<Task>;
};

describe('mapArchiveToWorklog', () => {
  it('should work for single task with multiple days', () => {
    const ts = fakeTaskStateFromArray([
      {
        ...DEFAULT_TASK,
        title: 'A',
        id: 'A',
        timeSpent: 13332,
        timeSpentOnDay: {
          '2015-01-15': 9999,
          '2018-02-16': 3333,
        }
      }
    ]);

    const r = mapArchiveToWorklog(ts, [], START_END_ALL);
    const w: Worklog = r.worklog;

    expect(r.totalTimeSpent).toBe(13332);

    expect(w[2015].timeSpent).toBe(9999);
    expect(w[2015].ent[1].timeSpent).toBe(9999);
    expect(w[2015].ent[1].daysWorked).toBe(1);
    expect(w[2015].ent[1].ent[15].timeSpent).toBe(9999);
    expect(w[2015].ent[1].ent[15].dayStr).toBe('Thu');
    expect(w[2015].ent[1].ent[15].dateStr).toBe('2015-01-15');
    expect(w[2015].ent[1].ent[15].logEntries.length).toBe(1);

    expect(w[2018].timeSpent).toBe(3333);
    expect(w[2018].ent[2].timeSpent).toBe(3333);
    expect(w[2018].ent[2].daysWorked).toBe(1);
    expect(w[2018].ent[2].ent[16].timeSpent).toBe(3333);
    expect(w[2018].ent[2].ent[16].dayStr).toBe('Fri');
    expect(w[2018].ent[2].ent[16].dateStr).toBe('2018-02-16');
    expect(w[2018].ent[2].ent[16].logEntries.length).toBe(1);
  });


  it('should work for parent task with sub tasks on separate days', () => {
    const ts = fakeTaskStateFromArray([
      {
        ...DEFAULT_TASK,
        title: 'A',
        id: 'A',
        subTaskIds: ['SUB_B', 'SUB_C'],
        timeSpent: 13332,
        timeSpentOnDay: {
          '2015-01-15': 9999,
          '2018-02-16': 3333,
        }
      },
      {
        ...DEFAULT_TASK,
        title: 'SUB_B',
        id: 'SUB_B',
        parentId: 'A',
        timeSpentOnDay: {
          '2015-01-15': 9999,
        }
      },
      {
        ...DEFAULT_TASK,
        title: 'SUB_C',
        id: 'SUB_C',
        parentId: 'A',
        timeSpentOnDay: {
          '2018-02-16': 3333,
        }
      },
    ]);


    const r = mapArchiveToWorklog(ts, [], START_END_ALL);
    const w: Worklog = r.worklog;

    expect(r.totalTimeSpent).toBe(13332);

    expect(w[2015].timeSpent).toBe(9999);
    expect(w[2015].ent[1].timeSpent).toBe(9999);
    expect(w[2015].ent[1].daysWorked).toBe(1);
    expect(w[2015].ent[1].ent[15].timeSpent).toBe(9999);
    expect(w[2015].ent[1].ent[15].logEntries.length).toBe(2);
    expect(w[2015].ent[1].ent[15].logEntries[0].task.id).toBe('A');
    expect(w[2015].ent[1].ent[15].logEntries[1].task.id).toBe('SUB_B');
    expect(w[2015].ent[1].ent[15].logEntries[1].parentId).toBe('A');

    expect(w[2018].timeSpent).toBe(3333);
    expect(w[2018].ent[2].timeSpent).toBe(3333);
    expect(w[2018].ent[2].daysWorked).toBe(1);
    expect(w[2018].ent[2].ent[16].timeSpent).toBe(3333);
    expect(w[2018].ent[2].ent[16].logEntries.length).toBe(2);
    expect(w[2018].ent[2].ent[16].logEntries[0].task.id).toBe('A');
    expect(w[2018].ent[2].ent[16].logEntries[1].task.id).toBe('SUB_C');
    expect(w[2018].ent[2].ent[16].logEntries[1].parentId).toBe('A');
  });
});
