import {arrayToDictionary} from '../../util/array-to-dictionary';
import {DEFAULT_TASK, TaskCopy, TaskState} from '../tasks/task.model';
import {mapArchiveToWorklog} from './map-archive-to-worklog';
import {initialTaskState} from '../tasks/store/task.reducer';
import {Dictionary} from '@ngrx/entity';
import {Worklog} from './worklog.model';

const START_END_ALL = {
  workStart: {
    '1200-05-05': 10713600000,
  },
  workEnd: {
    '2022-05-08': 1651968000000
  }
};

const fakeTaskStateFromArray = (tasks: TaskCopy[]): TaskState => {
  const dict = arrayToDictionary(tasks) as Dictionary<TaskCopy>;
  return {
    ...initialTaskState,
    entities: dict,
    ids: Object.keys(dict),
  } as TaskState;
};

describe('mapArchiveToWorklog', () => {
  it('should work for simple data', () => {
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
});
