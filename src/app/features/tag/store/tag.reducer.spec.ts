import { initialTagState, tagReducer } from './tag.reducer';
import { Tag, TagCopy } from '../tag.model';
import { deleteTask, moveToArchive_, restoreTask } from '../../tasks/store/task.actions';
import { TaskCopy, TaskWithSubTasks } from '../../tasks/task.model';
import { addTag } from './tag.actions';
import { TODAY_TAG } from '../tag.const';

/* eslint-disable @typescript-eslint/naming-convention */

describe('TagReducer', () => {
  describe('standard', () => {
    let initialState;

    beforeEach(() => {
      initialState = {
        ...initialTagState,
        entities: {
          '1': {
            id: '1',
            title: 'Test Tag',
            taskIds: ['task1', 'task2'],
          } as Tag,
          [TODAY_TAG.id]: TODAY_TAG,
        },
      };
    });

    it('should handle addTag action', () => {
      const newTag: Tag = {
        id: '2',
        title: 'New Tag',
        taskIds: [],
      } as any as Tag;
      const action = addTag({ tag: newTag });
      const state = tagReducer(initialState, action);

      expect(state.entities['2']).toEqual(newTag);
    });

    it('should handle addTag action', () => {
      const newTag: Tag = {
        id: '2',
        title: 'New Tag',
        taskIds: [],
      } as any as Tag;
      const action = addTag({ tag: newTag });
      const state = tagReducer(initialState, action);

      expect(state.entities['2']).toEqual(newTag);
    });
  });

  describe('moveToArchive_ action', () => {
    let initialState;

    beforeEach(() => {
      initialState = {
        ...initialTagState,
        entities: {
          '1': {
            id: '1',
            title: 'Test Tag',
            taskIds: ['task1', 'task2', 'subTask1', 'subTask2'],
          } as Tag,
          [TODAY_TAG.id]: TODAY_TAG,
        },
      };
    });

    it('should remove task IDs from tag', () => {
      const taskToArchive: TaskWithSubTasks = {
        id: 'task1',
        tagIds: ['1'],
        subTasks: [],
      } as any;
      const action = moveToArchive_({ tasks: [taskToArchive] });
      const state = tagReducer(initialState, action);

      expect((state.entities['1'] as TagCopy).taskIds).not.toContain('task1');
    });

    it('should remove subtask IDs from tag', () => {
      const subTasksToArchive: TaskCopy[] = [
        {
          id: 'subTask1',
          tagIds: ['1'],
        },
        {
          id: 'subTask2',
          tagIds: ['1'],
        },
      ] as TaskCopy[];

      const taskWithSubTasks: TaskWithSubTasks = {
        id: 'task1',
        tagIds: ['1'],
        subTasks: subTasksToArchive,
      } as TaskWithSubTasks;

      const action = moveToArchive_({ tasks: [taskWithSubTasks] });
      const state = tagReducer(initialState, action);

      expect((state.entities['1'] as TagCopy).taskIds).not.toContain('subTask1');
    });
  });

  describe('restoreTask action', () => {
    let initialState;

    beforeEach(() => {
      initialState = {
        ...initialTagState,
        entities: {
          '1': {
            id: '1',
            title: 'Test Tag',
            taskIds: ['task2'],
          } as Tag,
        },
      };
    });

    it('should add task and subtask IDs back to tag', () => {
      const subTasksToRestore: TaskCopy[] = [
        {
          id: 'subTask1',
          tagIds: ['1'],
        },
        {
          id: 'subTask2',
          tagIds: ['1'],
        },
      ] as TaskCopy[];

      const taskToRestore: TaskWithSubTasks = {
        id: 'task1',
        tagIds: ['1'],
        subTasks: subTasksToRestore,
      } as TaskWithSubTasks;

      const action = restoreTask({ task: taskToRestore, subTasks: subTasksToRestore });
      const state = tagReducer(initialState, action);

      expect((state.entities['1'] as TagCopy).taskIds).toContain('task1');
      expect((state.entities['1'] as TagCopy).taskIds).toContain('subTask1');
      expect((state.entities['1'] as TagCopy).taskIds).toContain('subTask2');
    });
  });

  describe('deleteTask action', () => {
    let initialState;

    beforeEach(() => {
      initialState = {
        ...initialTagState,
        entities: {
          '1': {
            id: '1',
            title: 'Test Tag',
            taskIds: ['task1', 'someOtherTask1'],
          } as Tag,
          '2': {
            id: '2',
            title: 'Test Tag 2',
            taskIds: ['subTask2', 'someOtherTask2'],
          } as Tag,
        },
      };
    });

    it('should remove subTaskIds from tags as well', () => {
      const subTasksToRemove: TaskCopy[] = [
        {
          id: 'subTask1',
          tagIds: ['2'],
        },
        {
          id: 'subTask2',
          tagIds: [],
        },
      ] as TaskCopy[];

      const taskToRemove: TaskWithSubTasks = {
        id: 'task1',
        tagIds: ['1'],
        subTasks: subTasksToRemove,
        subTaskIds: ['subTask1', 'subTask2'],
      } as TaskWithSubTasks;

      const action = deleteTask({ task: taskToRemove });
      const newState = tagReducer(
        {
          ...initialState,
          ids: ['1', '2'],
          entities: {
            [TODAY_TAG.id]: {
              id: TODAY_TAG.id,
              title: TODAY_TAG.title,
              taskIds: [] as string[],
            } as Tag,
            '1': {
              id: '1',
              title: 'Test Tag',
              taskIds: ['task1', 'someOtherTask1'],
            } as Tag,
            '2': {
              id: '2',
              title: 'Test Tag 2',
              taskIds: ['subTask2', 'someOtherTask2'],
            } as Tag,
          },
        },
        action,
      );

      expect((newState.entities['1'] as TagCopy).taskIds).toEqual(['someOtherTask1']);
      expect((newState.entities['2'] as TagCopy).taskIds).toEqual(['someOtherTask2']);
    });

    it('should  work when removing a sub task only', () => {
      const taskToRemove: TaskWithSubTasks = {
        id: 'task1',
        tagIds: ['1'],
      } as TaskWithSubTasks;

      const action = deleteTask({ task: taskToRemove });
      const state = tagReducer(
        {
          ...initialState,
          entities: {
            ...initialState.entities,
            [TODAY_TAG.id]: {
              id: TODAY_TAG.id,
              title: TODAY_TAG.title,
              taskIds: [] as string[],
            } as Tag,
          },
        },
        action,
      );

      expect((state.entities['1'] as TagCopy).taskIds).toEqual(['someOtherTask1']);
      expect((state.entities['2'] as TagCopy).taskIds).toEqual([
        'subTask2',
        'someOtherTask2',
      ]);
    });
  });
});
