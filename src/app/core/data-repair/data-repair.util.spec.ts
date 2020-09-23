import { AppDataComplete } from '../../imex/sync/sync.model';
import { createAppDataCompleteMock } from '../../util/app-data-mock';
import { dataRepair } from './data-repair.util';
import { fakeEntityStateFromArray } from '../../util/fake-entity-state-from-array';
import { DEFAULT_TASK, Task } from '../../features/tasks/task.model';
import { createEmptyEntity } from '../../util/create-empty-entity';
import { Tag, TagState } from '../../features/tag/tag.model';

fdescribe('dataRepair()', () => {
  let mock: AppDataComplete;
  beforeEach(() => {
    mock = createAppDataCompleteMock();
  });

  xit('should delete tasks with same id in "task" and "taskArchive', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'TEST',
        title: 'TEST',
      }])
    } as any;
    expect(dataRepair({
      ...mock,
      task: taskState,
      taskArchive: taskState,
    })).toEqual({
      ...mock,
      task: taskState,
      taskArchive: {
        ...taskState,
        ...createEmptyEntity()
      },
    });
  });


  xit('should delete missing tasks for tags today list', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'TEST',
        title: 'TEST',
      }])
    } as any;

    const tagState: TagState = {
      ...fakeEntityStateFromArray([{
        title: 'TEST_TAG',
        id: 'TEST_ID_TAG',
        taskIds: ['goneTag', 'TEST', 'noneExisting'],
      }] as Partial<Tag> []),
    };

    expect(dataRepair({
      ...mock,
      tag: tagState,
      task: taskState,
    })).toEqual({
      ...mock,
      task: taskState as any,
      tag: {
        ...tagState,
        entities: {
          TEST_ID_TAG: {
            title: 'TEST_TAG',
            id: 'TEST_ID_TAG',
            taskIds: ['TEST'],
          },
        } as any
      }
    });
  });


  it('should delete missing tasks for projects today list', () => {
  });
  it('should delete missing tasks for projects backlog list', () => {
  });

  // NOTE: by just executing unique on "ids"
  describe('should fix duplicate entities for', () => {
    it('task', () => {
    });
    it('taskArchive', () => {
    });
  });

  describe('should fix inconsistent entity states for', () => {
    it('task', () => {
    });
    it('taskArchive', () => {
    });
  });

  xit('should restore missing tasks from taskArchive if available', () => {
  });
});
