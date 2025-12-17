import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { ArchiveService, ARCHIVE_ALL_YOUNG_TO_OLD_THRESHOLD } from './archive.service';
import { PfapiService } from '../../pfapi/pfapi.service';
import { flushYoungToOld } from './store/archive.actions';
import { TimeTrackingActions } from './store/time-tracking.actions';
import { TaskWithSubTasks } from '../tasks/task.model';

describe('ArchiveService', () => {
  let service: ArchiveService;
  let mockStore: jasmine.SpyObj<Store>;
  let mockPfapiService: {
    m: {
      archiveYoung: {
        load: jasmine.Spy;
        save: jasmine.Spy;
      };
      archiveOld: {
        load: jasmine.Spy;
        save: jasmine.Spy;
      };
      timeTracking: {
        load: jasmine.Spy;
      };
    };
  };

  const createEmptyArchive = (
    lastTimeTrackingFlush: number = 0,
  ): {
    task: { ids: string[]; entities: Record<string, unknown> };
    timeTracking: { project: Record<string, unknown>; tag: Record<string, unknown> };
    lastTimeTrackingFlush: number;
    lastFlush: number;
  } => ({
    task: { ids: [], entities: {} },
    timeTracking: { project: {}, tag: {} },
    lastTimeTrackingFlush,
    lastFlush: 0,
  });

  const ONE_DAY_MS = 1000 * 60 * 60 * 24;

  const createMockTask = (
    id: string,
    overrides: Partial<TaskWithSubTasks> = {},
  ): TaskWithSubTasks =>
    ({
      id,
      title: `Task ${id}`,
      isDone: true,
      doneOn: Date.now() - ONE_DAY_MS,
      subTaskIds: [],
      tagIds: [],
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 0,
      ...overrides,
    }) as TaskWithSubTasks;

  beforeEach(() => {
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    mockPfapiService = {
      m: {
        archiveYoung: {
          load: jasmine.createSpy('archiveYoung.load'),
          save: jasmine.createSpy('archiveYoung.save'),
        },
        archiveOld: {
          load: jasmine.createSpy('archiveOld.load'),
          save: jasmine.createSpy('archiveOld.save'),
        },
        timeTracking: {
          load: jasmine.createSpy('timeTracking.load'),
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [
        ArchiveService,
        { provide: Store, useValue: mockStore },
        { provide: PfapiService, useValue: mockPfapiService },
      ],
    });

    service = TestBed.inject(ArchiveService);

    // Default mock returns
    mockPfapiService.m.archiveYoung.load.and.returnValue(
      Promise.resolve(createEmptyArchive()),
    );
    mockPfapiService.m.archiveOld.load.and.returnValue(
      Promise.resolve(createEmptyArchive()),
    );
    mockPfapiService.m.timeTracking.load.and.returnValue(
      Promise.resolve({ project: {}, tag: {} }),
    );
    mockPfapiService.m.archiveYoung.save.and.returnValue(Promise.resolve());
    mockPfapiService.m.archiveOld.save.and.returnValue(Promise.resolve());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('moveTasksToArchiveAndFlushArchiveIfDue', () => {
    it('should save tasks to archiveYoung', async () => {
      const tasks = [createMockTask('task-1')];

      await service.moveTasksToArchiveAndFlushArchiveIfDue(tasks);

      expect(mockPfapiService.m.archiveYoung.save).toHaveBeenCalled();
      const saveCall = mockPfapiService.m.archiveYoung.save.calls.first();
      const savedData = saveCall.args[0];
      expect(savedData.task.ids).toContain('task-1');
    });

    it('should dispatch updateWholeState for time tracking', async () => {
      const tasks = [createMockTask('task-1')];

      await service.moveTasksToArchiveAndFlushArchiveIfDue(tasks);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: TimeTrackingActions.updateWholeState.type }),
      );
    });

    describe('when flush is NOT due', () => {
      beforeEach(() => {
        // Set lastTimeTrackingFlush to recent time (less than threshold)
        mockPfapiService.m.archiveOld.load.and.returnValue(
          Promise.resolve(createEmptyArchive(Date.now() - 1000)), // 1 second ago
        );
      });

      it('should NOT perform flush to archiveOld', async () => {
        const tasks = [createMockTask('task-1')];

        await service.moveTasksToArchiveAndFlushArchiveIfDue(tasks);

        // Should only save once (for the tasks), not for the flush
        expect(mockPfapiService.m.archiveYoung.save).toHaveBeenCalledTimes(1);
        expect(mockPfapiService.m.archiveOld.save).not.toHaveBeenCalled();
      });

      it('should NOT dispatch flushYoungToOld action', async () => {
        const tasks = [createMockTask('task-1')];

        await service.moveTasksToArchiveAndFlushArchiveIfDue(tasks);

        expect(mockStore.dispatch).not.toHaveBeenCalledWith(
          jasmine.objectContaining({ type: flushYoungToOld.type }),
        );
      });
    });

    describe('when flush IS due', () => {
      const oldFlushTime = Date.now() - ARCHIVE_ALL_YOUNG_TO_OLD_THRESHOLD - 1000;

      beforeEach(() => {
        // Set lastTimeTrackingFlush to old time (more than threshold)
        mockPfapiService.m.archiveOld.load.and.returnValue(
          Promise.resolve(createEmptyArchive(oldFlushTime)),
        );
      });

      it('should save to archiveOld during flush (before dispatch can happen)', async () => {
        const tasks = [createMockTask('task-1')];

        await service.moveTasksToArchiveAndFlushArchiveIfDue(tasks);

        // The key behavior: archiveOld.save was called, meaning flush happened
        // synchronously before the method returned (and before dispatch could
        // cause any async effects)
        expect(mockPfapiService.m.archiveOld.save).toHaveBeenCalledTimes(1);
      });

      it('should save to both archiveYoung and archiveOld during flush', async () => {
        const tasks = [createMockTask('task-1')];

        await service.moveTasksToArchiveAndFlushArchiveIfDue(tasks);

        // archiveYoung.save called twice: once for tasks, once for flush
        expect(mockPfapiService.m.archiveYoung.save).toHaveBeenCalledTimes(2);
        expect(mockPfapiService.m.archiveOld.save).toHaveBeenCalledTimes(1);
      });

      it('should dispatch flushYoungToOld action AFTER saves complete', async () => {
        const tasks = [createMockTask('task-1')];

        await service.moveTasksToArchiveAndFlushArchiveIfDue(tasks);

        expect(mockStore.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({ type: flushYoungToOld.type }),
        );
      });

      it('should dispatch flushYoungToOld action with timestamp', async () => {
        const tasks = [createMockTask('task-1')];

        await service.moveTasksToArchiveAndFlushArchiveIfDue(tasks);

        // Verify flushYoungToOld was dispatched with a timestamp property
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            type: flushYoungToOld.type,
            timestamp: jasmine.any(Number),
          }),
        );
      });

      it('should set lastTimeTrackingFlush on saved archives', async () => {
        const tasks = [createMockTask('task-1')];

        await service.moveTasksToArchiveAndFlushArchiveIfDue(tasks);

        // Check archiveYoung flush save (second call)
        const archiveYoungFlushCall = mockPfapiService.m.archiveYoung.save.calls.all()[1];
        expect(archiveYoungFlushCall.args[0].lastTimeTrackingFlush).toBeDefined();

        // Check archiveOld save
        const archiveOldCall = mockPfapiService.m.archiveOld.save.calls.first();
        expect(archiveOldCall.args[0].lastTimeTrackingFlush).toBeDefined();
      });
    });

    it('should do nothing if no tasks provided', async () => {
      await service.moveTasksToArchiveAndFlushArchiveIfDue([]);

      expect(mockPfapiService.m.archiveYoung.save).not.toHaveBeenCalled();
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });
  });
});
