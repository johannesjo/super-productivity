import { convertTasksToMarkdown as formatTasksAsMarkdown, formatTask } from './sp-to-md';
import { Task } from '@super-productivity/plugin-api';

describe('sp-to-md', () => {
  describe('formatTask', () => {
    it('should format a simple task without ID', () => {
      const task: Task = {
        id: null,
        title: 'Simple task',
        isDone: false,
      } as Task;

      const result = formatTask(task);
      expect(result).toBe('- [ ] Simple task');
    });

    it('should format a simple task with ID', () => {
      const task: Task = {
        id: 'task-123',
        title: 'Task with ID',
        isDone: false,
      } as Task;

      const result = formatTask(task);
      expect(result).toBe('- [ ] <!--task-123--> Task with ID');
    });

    it('should format a completed task', () => {
      const task: Task = {
        id: 'task-456',
        title: 'Completed task',
        isDone: true,
      } as Task;

      const result = formatTask(task);
      expect(result).toBe('- [x] <!--task-456--> Completed task');
    });

    it('should format a subtask with indentation', () => {
      const task: Task = {
        id: 'sub-123',
        title: 'Subtask',
        isDone: false,
      } as Task;

      const result = formatTask(task, 2);
      expect(result).toBe('  - [ ] <!--sub-123--> Subtask');
    });
  });

  describe('formatTasksAsMarkdown', () => {
    it('should format a single task without blank lines', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Single task',
          isDone: false,
          projectId: 'project-1',
        } as Task,
      ];

      const result = formatTasksAsMarkdown(tasks);
      expect(result).toBe('- [ ] <!--task-1--> Single task');
    });

    it('should format multiple tasks without blank lines between them', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'First task',
          isDone: false,
          projectId: 'project-1',
        } as Task,
        {
          id: 'task-2',
          title: 'Second task',
          isDone: true,
          projectId: 'project-1',
        } as Task,
        {
          id: 'task-3',
          title: 'Third task',
          isDone: false,
          projectId: 'project-1',
        } as Task,
      ];

      const result = formatTasksAsMarkdown(tasks);
      const expected = `- [ ] <!--task-1--> First task
- [x] <!--task-2--> Second task
- [ ] <!--task-3--> Third task`;

      expect(result).toBe(expected);
      expect(result.split('\n').length).toBe(3); // Ensure no extra lines
    });

    it('should format tasks with subtasks properly indented', () => {
      const tasks: Task[] = [
        {
          id: 'parent-1',
          title: 'Parent task',
          isDone: false,
          projectId: 'project-1',
          subTaskIds: ['sub-1', 'sub-2'],
        } as Task,
        {
          id: 'sub-1',
          title: 'Subtask 1',
          isDone: false,
          parentId: 'parent-1',
          projectId: 'project-1',
        } as Task,
        {
          id: 'sub-2',
          title: 'Subtask 2',
          isDone: true,
          parentId: 'parent-1',
          projectId: 'project-1',
        } as Task,
      ];

      const result = formatTasksAsMarkdown(tasks);
      const expected = `- [ ] <!--parent-1--> Parent task
  - [ ] <!--sub-1--> Subtask 1
  - [x] <!--sub-2--> Subtask 2`;

      expect(result).toBe(expected);
    });

    it('should format multiple parent tasks with subtasks without blank lines', () => {
      const tasks: Task[] = [
        {
          id: 'parent-1',
          title: 'First parent',
          isDone: false,
          projectId: 'project-1',
          subTaskIds: ['sub-1'],
        } as Task,
        {
          id: 'sub-1',
          title: 'Subtask of first',
          isDone: false,
          parentId: 'parent-1',
          projectId: 'project-1',
        } as Task,
        {
          id: 'parent-2',
          title: 'Second parent',
          isDone: false,
          projectId: 'project-1',
          subTaskIds: ['sub-2'],
        } as Task,
        {
          id: 'sub-2',
          title: 'Subtask of second',
          isDone: true,
          parentId: 'parent-2',
          projectId: 'project-1',
        } as Task,
      ];

      const result = formatTasksAsMarkdown(tasks);
      const expected = `- [ ] <!--parent-1--> First parent
  - [ ] <!--sub-1--> Subtask of first
- [ ] <!--parent-2--> Second parent
  - [x] <!--sub-2--> Subtask of second`;

      expect(result).toBe(expected);
      expect(result.split('\n').length).toBe(4); // No blank lines between groups
    });

    it('should handle tasks with notes without adding blank lines', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Task with notes',
          isDone: false,
          projectId: 'project-1',
          notes: 'This is a note\nMultiline note',
        } as Task,
        {
          id: 'task-2',
          title: 'Another task',
          isDone: false,
          projectId: 'project-1',
        } as Task,
      ];

      const result = formatTasksAsMarkdown(tasks);
      const expected = `- [ ] <!--task-1--> Task with notes
  This is a note
  Multiline note
- [ ] <!--task-2--> Another task`;

      expect(result).toBe(expected);
    });

    it('should handle subtasks with notes', () => {
      const tasks: Task[] = [
        {
          id: 'parent-1',
          title: 'Parent task',
          isDone: false,
          projectId: 'project-1',
          subTaskIds: ['sub-1'],
        } as Task,
        {
          id: 'sub-1',
          title: 'Subtask with notes',
          isDone: false,
          parentId: 'parent-1',
          projectId: 'project-1',
          notes: 'Subtask note line 1\nSubtask note line 2',
        } as Task,
      ];

      const result = formatTasksAsMarkdown(tasks);
      const expected = `- [ ] <!--parent-1--> Parent task
  - [ ] <!--sub-1--> Subtask with notes
    Subtask note line 1
    Subtask note line 2`;

      expect(result).toBe(expected);
    });

    it('should handle empty task list', () => {
      const tasks: Task[] = [];
      const result = formatTasksAsMarkdown(tasks);
      expect(result).toBe('');
    });

    it('should handle orphaned subtasks gracefully', () => {
      const tasks: Task[] = [
        {
          id: 'orphan-sub',
          title: 'Orphaned subtask',
          isDone: false,
          parentId: 'non-existent-parent',
          projectId: 'project-1',
        } as Task,
      ];

      const result = formatTasksAsMarkdown(tasks);
      // Orphaned subtasks should still be included, just not indented
      expect(result).toBe('- [ ] <!--orphan-sub--> Orphaned subtask');
    });
  });
});
