import { initialTagState, tagReducer } from './tag.reducer';
import * as tagActions from './tag.actions';
import { Tag, TagCopy } from '../tag.model';
import { moveToArchive_ } from '../../tasks/store/task.actions';
import { TaskCopy, TaskWithSubTasks } from '../../tasks/task.model';

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
      const action = tagActions.addTag({ tag: newTag });
      const state = tagReducer(initialState, action);

      expect(state.entities['2']).toEqual(newTag);
    });

    it('should handle addTag action', () => {
      const newTag: Tag = {
        id: '2',
        title: 'New Tag',
        taskIds: [],
      } as any as Tag;
      const action = tagActions.addTag({ tag: newTag });
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
});
