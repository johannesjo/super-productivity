import { initialTagState, tagReducer } from './tag.reducer';
import { Tag, TagCopy } from '../tag.model';
import { moveToArchive_, restoreTask } from '../../tasks/store/task.actions';
import { TaskCopy, TaskWithSubTasks } from '../../tasks/task.model';
import { addTag } from './tag.actions';

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
});
