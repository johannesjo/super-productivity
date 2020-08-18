import { mapToProjectWithTasks } from './map-to-project-with-tasks.util';

describe('mapToProjectWithTasks()', () => {
  it('should return a mapped project', () => {
    const project = {
      id: 'PID',
      title: 'P_TITLE'
    };
    expect(mapToProjectWithTasks(project as any, [], 'TODAY_STR')).toEqual({
      id: 'PID',
      title: 'P_TITLE',
      color: undefined,
      tasks: [],
      timeSpentToday: 0
    });
  });

  it('should return a mapped project with accumulated time spent for tasks', () => {
    const project = {
      id: 'PID',
      title: 'P_TITLE'
    };
    const TDS = 'TODAY_STR';
    const flatTasks = [
      {parentId: 'IGNORE', timeSpentOnDay: {[TDS]: 100000}},
      {timeSpentOnDay: {[TDS]: 111}},
      {timeSpentOnDay: {[TDS]: 222}},
      {timeSpentOnDay: {fakeOtherDayProp: 444}},
    ];
    expect(mapToProjectWithTasks(project as any, flatTasks as any, TDS)).toEqual({
      id: 'PID',
      title: 'P_TITLE',
      color: undefined,
      tasks: [],
      timeSpentToday: 0
    });
  });
});
