import { createMarkdownLine } from './createMarkdownLine';
import { MarkdownTask } from './types';

describe('createMarkdownLine', () => {
  it('should create line with ID for uncompleted task', () => {
    const task: MarkdownTask = {
      line: '- [ ] Task without ID',
      lineNumber: 0,
      title: 'Task without ID',
      isDone: false,
    };

    const result = createMarkdownLine(task, 'new-id-123');
    expect(result).toBe('- [ ] <!-- sp:new-id-123 --> Task without ID');
  });

  it('should create line with ID for completed task', () => {
    const task: MarkdownTask = {
      line: '- [x] Completed task',
      lineNumber: 0,
      title: 'Completed task',
      isDone: true,
    };

    const result = createMarkdownLine(task, 'task-456');
    expect(result).toBe('- [x] <!-- sp:task-456 --> Completed task');
  });

  it('should preserve indentation', () => {
    const task: MarkdownTask = {
      line: '    - [ ] Indented task',
      lineNumber: 0,
      title: 'Indented task',
      isDone: false,
    };

    const result = createMarkdownLine(task, 'indented-789');
    expect(result).toBe('    - [ ] <!-- sp:indented-789 --> Indented task');
  });

  it('should handle tasks with existing IDs', () => {
    const task: MarkdownTask = {
      line: '  - [ ] <!-- sp:old-id --> Task with old ID',
      lineNumber: 0,
      id: 'old-id',
      title: 'Task with old ID',
      isDone: false,
    };

    const result = createMarkdownLine(task, 'new-id');
    expect(result).toBe('  - [ ] <!-- sp:new-id --> Task with old ID');
  });

  it('should handle empty titles', () => {
    const task: MarkdownTask = {
      line: '- [ ] ',
      lineNumber: 0,
      title: '',
      isDone: false,
    };

    const result = createMarkdownLine(task, 'empty-id');
    expect(result).toBe('- [ ] <!-- sp:empty-id --> ');
  });

  it('should handle deeply nested tasks', () => {
    const task: MarkdownTask = {
      line: '      - [x] Very nested',
      lineNumber: 0,
      title: 'Very nested',
      isDone: true,
    };

    const result = createMarkdownLine(task, 'nested-id');
    expect(result).toBe('      - [x] <!-- sp:nested-id --> Very nested');
  });
});
