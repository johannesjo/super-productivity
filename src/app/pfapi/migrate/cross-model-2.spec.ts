import { crossModelMigration2 } from './cross-model-2';

describe('crossModelMigration2()', () => {
  it('should work and migrate projects', () => {
    const r = crossModelMigration2({
      taskArchive: { ids: [], entities: {} },
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
      taskArchive: { ids: [], entities: {} },
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
        lastFlush: 0,
      },
      archive: {
        task: { ids: [], entities: {} },
        timeTracking: {
          project: {},
          tag: {},
          lastFlush: 0,
        },
      },
      archiveOld: {
        task: { ids: [], entities: {} },
        timeTracking: {
          project: {},
          tag: {},
          lastFlush: 0,
        },
      },
    } as any as any);
  });

  it('should work and migrate tags too', () => {
    const r = crossModelMigration2({
      taskArchive: { ids: [], entities: {} },
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
      taskArchive: { ids: [], entities: {} },
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
        lastFlush: 0,
      },
      archive: {
        task: { ids: [], entities: {} },
        timeTracking: {
          project: {},
          tag: {},
          lastFlush: 0,
        },
      },
      archiveOld: {
        task: { ids: [], entities: {} },
        timeTracking: {
          project: {},
          tag: {},
          lastFlush: 0,
        },
      },
    } as any as any);
  });
});
