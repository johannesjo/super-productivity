import { parseMarkdown } from '../../sync/markdown-parser';
import { generateTaskOperations } from '../../sync/generate-task-operations';

describe('Markdown Parser Integration - 4-space indented subtasks', () => {
  it('should create proper parent-child relationships for 4-space indented subtasks when syncing to empty SP', () => {
    const markdown = `- [ ] then i am adding tasks
    - [ ] yeah and sub tasks nicely
    - [ ] or is it?
    - [ ] what is going on?`;

    // Step 1: Parse markdown
    const parsedTasks = parseMarkdown(markdown);

    // Verify parsing assigns temporary parent IDs
    expect(parsedTasks[0].parentId).toBe(null);
    expect(parsedTasks[1].parentId).toBe('temp_0');
    expect(parsedTasks[2].parentId).toBe('temp_0');
    expect(parsedTasks[3].parentId).toBe('temp_0');

    // Step 2: Generate operations for empty SP
    const spTasks: any[] = [];
    const projectId = 'test-project';
    const operations = generateTaskOperations(parsedTasks, spTasks, projectId);

    // Verify operations maintain parent-child relationships
    const createOps = operations.filter((op) => op.type === 'create');
    expect(createOps).toHaveLength(4);

    // Parent task (parentId should not be included when null)
    expect(createOps[0]).toMatchObject({
      type: 'create',
      tempId: 'temp_0',
      data: {
        title: 'then i am adding tasks',
      },
    });
    expect(createOps[0].data.parentId).toBeUndefined();

    // Subtasks reference parent by temp ID
    expect(createOps[1]).toMatchObject({
      type: 'create',
      tempId: 'temp_1',
      data: {
        title: 'yeah and sub tasks nicely',
        parentId: 'temp_0',
      },
    });

    expect(createOps[2]).toMatchObject({
      type: 'create',
      tempId: 'temp_2',
      data: {
        title: 'or is it?',
        parentId: 'temp_0',
      },
    });

    expect(createOps[3]).toMatchObject({
      type: 'create',
      tempId: 'temp_3',
      data: {
        title: 'what is going on?',
        parentId: 'temp_0',
      },
    });
  });

  it('should handle mixed indentation with and without IDs', () => {
    const markdown = `- [ ] <!--parent1--> Parent with ID
    - [ ] Subtask without ID
- [ ] Parent without ID
    - [ ] Another subtask without ID`;

    const parsedTasks = parseMarkdown(markdown);

    // First parent has ID, so subtask references it directly
    expect(parsedTasks[1].parentId).toBe('parent1');

    // Second parent has no ID, so subtask references temp ID
    expect(parsedTasks[3].parentId).toBe('temp_2');
  });
});
