import { mapToProjectWithTasks } from './map-to-project-with-tasks.util';

describe('mapToProjectWithTasks()', () => {
  it('should return a mapped project', () => {
    const project = {
      id: 'PID',
      title: 'P_TITLE',
    };
    expect(mapToProjectWithTasks(project as any, [], 'TODAY_STR')).toEqual({
      id: 'PID',
      title: 'P_TITLE',
      color: undefined,
      tasks: [],
      timeSpentToday: 0,
      timeSpentYesterday: undefined,
    });
  });

  it('should return a mapped project with accumulated time spent for tasks', () => {
    const project = {
      id: 'PID',
      title: 'P_TITLE',
    };
    const TDS = 'TODAY_STR';
    const flatTasks = [
      { projectId: 'PID', parentId: 'IGNORE', timeSpentOnDay: { [TDS]: 100000 } },
      { projectId: 'PID', timeSpentOnDay: { [TDS]: 111 } },
      { projectId: 'PID', timeSpentOnDay: { [TDS]: 222 } },
      { projectId: 'PID', timeSpentOnDay: { fakeOtherDayProp: 444 } },
      { projectId: 'OTHER_PID', timeSpentOnDay: { [TDS]: 222 } },
    ];
    expect(mapToProjectWithTasks(project as any, flatTasks as any, TDS)).toEqual({
      id: 'PID',
      title: 'P_TITLE',
      color: undefined,
      tasks: [
        { projectId: 'PID', parentId: 'IGNORE', timeSpentOnDay: { [TDS]: 100000 } },
        { projectId: 'PID', timeSpentOnDay: { [TDS]: 111 } },
        { projectId: 'PID', timeSpentOnDay: { [TDS]: 222 } },
        { projectId: 'PID', timeSpentOnDay: { fakeOtherDayProp: 444 } },
      ] as any,
      timeSpentToday: 333,
      timeSpentYesterday: undefined,
    });
  });

  it('should return a mapped project with accumulated time spent for tasks yesterday', () => {
    const project = {
      id: 'PID',
      title: 'P_TITLE',
    };
    const TDS = 'TODAY_STR';
    const YDS = 'YESTERDAY_STR';
    const flatTasks = [
      { projectId: 'PID', parentId: 'IGNORE', timeSpentOnDay: { [TDS]: 100000 } },
      { projectId: 'PID', timeSpentOnDay: { [TDS]: 111 } },
      { projectId: 'PID', timeSpentOnDay: { [YDS]: 222 } },
      { projectId: 'PID', timeSpentOnDay: { [YDS]: 444 } },
      { projectId: 'OTHER_PID', timeSpentOnDay: { [YDS]: 222 } },
    ];
    expect(mapToProjectWithTasks(project as any, flatTasks as any, TDS, YDS)).toEqual({
      id: 'PID',
      title: 'P_TITLE',
      color: undefined,
      tasks: [
        { projectId: 'PID', parentId: 'IGNORE', timeSpentOnDay: { [TDS]: 100000 } },
        { projectId: 'PID', timeSpentOnDay: { [TDS]: 111 } },
        { projectId: 'PID', timeSpentOnDay: { [YDS]: 222 } },
        { projectId: 'PID', timeSpentOnDay: { [YDS]: 444 } },
      ] as any,
      timeSpentToday: 111,
      timeSpentYesterday: 666,
    });
  });
});
