import { buildBatchOperations, buildIdUpdateQueue, SPTask } from '../batch-operations';
import { ParsedTask } from '../markdown-parser';

describe('batch-operations', () => {
  let mockGenerateTempId: jest.Mock;
  let tempIdCounter: number;

  beforeEach(() => {
    tempIdCounter = 0;
    mockGenerateTempId = jest.fn().mockImplementation(() => `temp_${tempIdCounter++}`);
  });

  describe('buildBatchOperations', () => {
    it('should create operations for new tasks', () => {
      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: null,
          title: 'New task',
          originalLine: '- [ ] New task',
          parentId: null,
          isSubtask: false,
        },
      ];

      const spTasks: SPTask[] = [];

      const result = buildBatchOperations(mdTasks, spTasks, mockGenerateTempId);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]).toEqual({
        type: 'create',
        tempId: 'temp_0',
        data: {
          title: 'New task',
          isDone: false,
          parentId: null,
        },
      });
    });

    it('should create update operations for existing tasks', () => {
      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: true,
          id: 'sp-task-1',
          title: 'Updated task title',
          originalLine: '- [x] <!-- sp:sp-task-1 --> Updated task title',
          parentId: null,
          isSubtask: false,
        },
      ];

      const spTasks: SPTask[] = [
        {
          id: 'sp-task-1',
          title: 'Old task title',
          isDone: false,
          notes: '',
          parentId: undefined,
          subTaskIds: [],
          projectId: 'project-1',
        },
      ];

      const result = buildBatchOperations(mdTasks, spTasks, mockGenerateTempId);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]).toEqual({
        type: 'update',
        taskId: 'sp-task-1',
        updates: {
          title: 'Updated task title',
          isDone: true,
        },
      });
    });

    it('should create delete operations for removed tasks', () => {
      const mdTasks: ParsedTask[] = [];

      const spTasks: SPTask[] = [
        {
          id: 'sp-task-1',
          title: 'Task to delete',
          isDone: false,
          notes: '',
          parentId: undefined,
          subTaskIds: [],
          projectId: 'project-1',
        },
      ];

      const result = buildBatchOperations(mdTasks, spTasks, mockGenerateTempId);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]).toEqual({
        type: 'delete',
        taskId: 'sp-task-1',
      });
    });

    it('should handle orphaned tasks (warn but not crash)', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: 'orphaned-id',
          title: 'Orphaned task',
          originalLine: '- [ ] <!-- sp:orphaned-id --> Orphaned task',
          parentId: null,
          isSubtask: false,
        },
      ];

      const spTasks: SPTask[] = []; // No SP task with this ID

      const result = buildBatchOperations(mdTasks, spTasks, mockGenerateTempId);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Orphaned task with ID orphaned-id: "Orphaned task"',
      );
      expect(result.operations).toHaveLength(0);

      consoleWarnSpy.mockRestore();
    });

    it('should build correct tracking maps', () => {
      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: null,
          title: 'New task',
          originalLine: '- [ ] New task',
          parentId: null,
          isSubtask: false,
        },
        {
          line: 1,
          indent: 0,
          completed: false,
          id: 'sp-task-1',
          title: 'Existing task',
          originalLine: '- [ ] <!-- sp:sp-task-1 --> Existing task',
          parentId: null,
          isSubtask: false,
        },
      ];

      const spTasks: SPTask[] = [
        {
          id: 'sp-task-1',
          title: 'Existing task',
          isDone: false,
          notes: '',
          parentId: undefined,
          subTaskIds: [],
          projectId: 'project-1',
        },
      ];

      const result = buildBatchOperations(mdTasks, spTasks, mockGenerateTempId);

      // Only the new task (line 0) should have a temp ID
      expect(result.tempIdMap.size).toBe(0);
      expect(result.taskLineToTempId.get(0)).toBe('temp_0');
      expect(result.mdIdToLine.get('line-0')).toBe(0);
      expect(result.mdIdToLine.get('sp-task-1')).toBe(1);
    });
  });

  describe('buildIdUpdateQueue', () => {
    it('should build ID update queue correctly', () => {
      const createdTaskIds = {
        temp_0: 'actual-id-1',
        temp_1: 'actual-id-2',
      };

      const tempIdMap = new Map([
        ['md-123-abc', 'temp_0'],
        ['md-456-def', 'temp_1'],
      ]);

      const mdIdToLine = new Map([
        ['md-123-abc', 0],
        ['md-456-def', 1],
      ]);

      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: null,
          title: 'Task 1',
          originalLine: '- [ ] Task 1',
          parentId: null,
          isSubtask: false,
        },
        {
          line: 1,
          indent: 2,
          completed: true,
          id: null,
          title: 'Task 2',
          originalLine: '  - [x] Task 2',
          parentId: null,
          isSubtask: true,
        },
      ];

      const result = buildIdUpdateQueue(createdTaskIds, tempIdMap, mdIdToLine, mdTasks);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        tempId: 'temp_0',
        actualId: 'actual-id-1',
        mdId: 'md-123-abc',
        line: 0,
        task: {
          indent: 0,
          completed: false,
          title: 'Task 1',
        },
      });
      expect(result[1]).toEqual({
        tempId: 'temp_1',
        actualId: 'actual-id-2',
        mdId: 'md-456-def',
        line: 1,
        task: {
          indent: 2,
          completed: true,
          title: 'Task 2',
        },
      });
    });

    it('should handle missing mappings gracefully', () => {
      const createdTaskIds = {
        temp_0: 'actual-id-1',
        temp_999: 'missing-mapping', // This won't have corresponding maps
      };

      const tempIdMap = new Map([['md-123-abc', 'temp_0']]);

      const mdIdToLine = new Map([['md-123-abc', 0]]);

      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: null,
          title: 'Task 1',
          originalLine: '- [ ] Task 1',
          parentId: null,
          isSubtask: false,
        },
      ];

      const result = buildIdUpdateQueue(createdTaskIds, tempIdMap, mdIdToLine, mdTasks);

      expect(result).toHaveLength(1);
      expect(result[0].tempId).toBe('temp_0');
    });
  });
});
