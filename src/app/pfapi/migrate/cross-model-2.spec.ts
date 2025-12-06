import { crossModelMigration2 } from './cross-model-2';

describe('crossModelMigration2()', () => {
  it('should work and migrate projects', () => {
    const r = crossModelMigration2({
      boards: { boardCfgs: [] },
      taskArchive: { ids: ['ARCHIE_TASK_ID'], entities: { ARCHIE_TASK_ID: {} } },
      task: { ids: [], entities: {} },
      project: {
        entities: {
          P1: {
            id: 'P1',
            workStart: { D1: 1, D2: 11 },
            workEnd: { D1: 2 },
            breakNr: { D1: 3 },
            breakTime: { D1: 4 },
          },
        },
      },
      tag: { entities: {} },
    } as any);
    expect(r).toEqual({
      boards: { boardCfgs: [] },
      task: { ids: [], entities: {} },
      project: {
        entities: {
          P1: {
            id: 'P1',
          },
        },
      },
      tag: { entities: {} },
      timeTracking: {
        project: {
          P1: {
            D1: {
              s: 1,
              e: 2,
              b: 3,
              bt: 4,
            },
            D2: {
              s: 11,
            },
          },
        },
        tag: {},
      },
      archiveYoung: {
        task: {
          ids: ['ARCHIE_TASK_ID'],
          entities: {
            ARCHIE_TASK_ID: {
              created: 0,
              timeEstimate: 0,
              timeSpentOnDay: {},
            },
          },
        },
        timeTracking: {
          project: {},
          tag: {},
        },
        lastTimeTrackingFlush: 0,
      },
      archiveOld: {
        task: { ids: [], entities: {} },
        timeTracking: {
          project: {},
          tag: {},
        },
        lastTimeTrackingFlush: 0,
      },
    } as any as any);
  });

  it('should work and migrate tags too', () => {
    const r = crossModelMigration2({
      boards: { boardCfgs: [] },
      task: { ids: [], entities: {} },
      taskArchive: { ids: ['ARCHIE_TASK_ID'], entities: { ARCHIE_TASK_ID: {} } },
      project: {
        entities: {
          P1: {
            id: 'P1',
            workStart: { D1: 1, D2: 11 },
            workEnd: { D1: 2 },
            breakNr: { D1: 3 },
            breakTime: { D1: 4 },
          },
        },
      },
      tag: {
        entities: {
          T1: {
            id: 'T1',
            workStart: { D1: 1, D2: 11 },
            workEnd: { D1: 2 },
            breakNr: { D1: 3 },
            breakTime: { D1: 4 },
          },
        },
      },
    } as any);
    expect(r).toEqual({
      boards: { boardCfgs: [] },
      task: { ids: [], entities: {} },
      project: {
        entities: {
          P1: {
            id: 'P1',
          },
        },
      },
      tag: {
        entities: {
          T1: {
            id: 'T1',
          },
        },
      },
      timeTracking: {
        project: {
          P1: {
            D1: {
              s: 1,
              e: 2,
              b: 3,
              bt: 4,
            },
            D2: {
              s: 11,
            },
          },
        },
        tag: {
          T1: {
            D1: {
              s: 1,
              e: 2,
              b: 3,
              bt: 4,
            },
            D2: {
              s: 11,
            },
          },
        },
      },
      archiveYoung: {
        task: {
          ids: ['ARCHIE_TASK_ID'],
          entities: {
            ARCHIE_TASK_ID: { created: 0, timeEstimate: 0, timeSpentOnDay: {} },
          },
        },
        timeTracking: {
          project: {},
          tag: {},
        },
        lastTimeTrackingFlush: 0,
      },
      archiveOld: {
        task: { ids: [], entities: {} },
        timeTracking: {
          project: {},
          tag: {},
        },
        lastTimeTrackingFlush: 0,
      },
    } as any as any);
  });

  describe('timeSpentOnDay initialization', () => {
    it('should initialize timeSpentOnDay to empty object if missing from active task', () => {
      const r = crossModelMigration2({
        boards: { boardCfgs: [] },
        taskArchive: { ids: [], entities: {} },
        task: {
          ids: ['TASK1'],
          entities: {
            TASK1: {
              id: 'TASK1',
              timeSpent: 3600000,
              // timeSpentOnDay is missing
            },
          },
        },
        project: { entities: {} },
        tag: { entities: {} },
      } as any);

      expect((r as any).task.entities['TASK1'].timeSpentOnDay).toEqual({});
    });

    it('should initialize timeSpentOnDay to empty object if missing from archived task', () => {
      const r = crossModelMigration2({
        boards: { boardCfgs: [] },
        taskArchive: {
          ids: ['ARCHIVED_TASK1'],
          entities: {
            ARCHIVED_TASK1: {
              id: 'ARCHIVED_TASK1',
              timeSpent: 7200000,
              // timeSpentOnDay is missing
            },
          },
        },
        task: { ids: [], entities: {} },
        project: { entities: {} },
        tag: { entities: {} },
      } as any);

      expect(
        (r as any).archiveYoung.task.entities['ARCHIVED_TASK1'].timeSpentOnDay,
      ).toEqual({});
    });

    it('should preserve existing timeSpentOnDay for active tasks', () => {
      const r = crossModelMigration2({
        boards: { boardCfgs: [] },
        taskArchive: { ids: [], entities: {} },
        task: {
          ids: ['TASK1'],
          entities: {
            TASK1: {
              id: 'TASK1',
              timeSpent: 3600000,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              timeSpentOnDay: { '2024-01-15': 1800000, '2024-01-16': 1800000 },
            },
          },
        },
        project: { entities: {} },
        tag: { entities: {} },
      } as any);

      expect((r as any).task.entities['TASK1'].timeSpentOnDay).toEqual({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '2024-01-15': 1800000,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '2024-01-16': 1800000,
      });
    });

    it('should preserve existing timeSpentOnDay for archived tasks', () => {
      const r = crossModelMigration2({
        boards: { boardCfgs: [] },
        taskArchive: {
          ids: ['ARCHIVED_TASK1'],
          entities: {
            ARCHIVED_TASK1: {
              id: 'ARCHIVED_TASK1',
              timeSpent: 7200000,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              timeSpentOnDay: { '2024-01-10': 3600000, '2024-01-11': 3600000 },
            },
          },
        },
        task: { ids: [], entities: {} },
        project: { entities: {} },
        tag: { entities: {} },
      } as any);

      expect(
        (r as any).archiveYoung.task.entities['ARCHIVED_TASK1'].timeSpentOnDay,
      ).toEqual({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '2024-01-10': 3600000,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '2024-01-11': 3600000,
      });
    });

    it('should preserve timeSpent value for archived tasks', () => {
      const r = crossModelMigration2({
        boards: { boardCfgs: [] },
        taskArchive: {
          ids: ['ARCHIVED_TASK1'],
          entities: {
            ARCHIVED_TASK1: {
              id: 'ARCHIVED_TASK1',
              timeSpent: 7200000,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              timeSpentOnDay: { '2024-01-10': 7200000 },
            },
          },
        },
        task: { ids: [], entities: {} },
        project: { entities: {} },
        tag: { entities: {} },
      } as any);

      expect((r as any).archiveYoung.task.entities['ARCHIVED_TASK1'].timeSpent).toBe(
        7200000,
      );
    });
  });
});
