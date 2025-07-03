import { parseMarkdownTasks } from '../markdown-parser';

describe('Simplified Notes Sync', () => {
  describe('parseMarkdownTasks - third level content as notes', () => {
    it('should treat all content after a subtask as notes until the next task', () => {
      const content = `- [ ] Parent Task
  - [ ] Sub Task
    This is a note line
    - [ ] This looks like a task but should be notes
    Another note line
This line has no indent but is still notes
    Back to indented notes`;

      const result = parseMarkdownTasks(content);

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].title).toBe('Parent Task');
      expect(result.tasks[0].isSubtask).toBe(false);
      expect(result.tasks[0].noteLines).toBeUndefined();

      expect(result.tasks[1].title).toBe('Sub Task');
      expect(result.tasks[1].isSubtask).toBe(true);
      expect(result.tasks[1].noteLines).toEqual([
        '    This is a note line',
        '    - [ ] This looks like a task but should be notes',
        '    Another note line',
        'This line has no indent but is still notes',
        '    Back to indented notes',
      ]);
    });

    it('should handle mixed content in notes', () => {
      const content = `- [ ] <!-- sp:task1 --> Parent Task
  - [ ] <!-- sp:task2 --> Sub Task with notes
    - [ ] Checklist item in notes
    - [x] Completed checklist item
    Regular text line
        Indented text line
    * Bullet point
    1. Numbered item`;

      const result = parseMarkdownTasks(content);

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[1].noteLines).toEqual([
        '    - [ ] Checklist item in notes',
        '    - [x] Completed checklist item',
        '    Regular text line',
        '        Indented text line',
        '    * Bullet point',
        '    1. Numbered item',
      ]);
    });

    it('should not create tasks from third-level task syntax', () => {
      const content = `- [ ] Parent
  - [ ] Subtask
    - [ ] This should be notes, not a task
    - [x] This too`;

      const result = parseMarkdownTasks(content);

      // Should only have 2 tasks, not 4
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[1].noteLines).toHaveLength(2);
    });

    it('should preserve exact formatting of notes content', () => {
      const content = `- [ ] Parent
  - [ ] Subtask
          Heavily indented line
    Line with trailing spaces    
    
    Empty line above
    	Line with tab`;

      const result = parseMarkdownTasks(content);

      expect(result.tasks[1].noteLines).toEqual([
        '          Heavily indented line',
        '    Line with trailing spaces    ',
        '    ',
        '    Empty line above',
        '    \tLine with tab',
      ]);
    });

    it('should handle multiple subtasks with notes', () => {
      const content = `- [ ] Parent Task
  - [ ] First Subtask
    Notes for first
    More notes
  - [ ] Second Subtask
    Notes for second
- [ ] Another Parent
  - [ ] Another Subtask
    Different notes`;

      const result = parseMarkdownTasks(content);

      expect(result.tasks).toHaveLength(5);

      // First subtask notes
      expect(result.tasks[1].noteLines).toEqual([
        '    Notes for first',
        '    More notes',
      ]);

      // Second subtask notes
      expect(result.tasks[2].noteLines).toEqual(['    Notes for second']);

      // Another subtask notes
      expect(result.tasks[4].noteLines).toEqual(['    Different notes']);
    });

    it('should not assign notes to parent tasks at depth 0', () => {
      const content = `- [ ] Parent Task
This line is between parent and subtask
  - [ ] Subtask
    This IS notes for the subtask
Even this unindented line`;

      const result = parseMarkdownTasks(content);

      expect(result.tasks[0].noteLines).toBeUndefined();
      expect(result.tasks[1].noteLines).toEqual([
        '    This IS notes for the subtask',
        'Even this unindented line',
      ]);
    });

    it('should handle deeply nested content (4+ levels)', () => {
      const content = `- [ ] Parent
  - [ ] Subtask
    Level 3 - notes
      Level 4 - still notes
        Level 5 - also notes`;

      const result = parseMarkdownTasks(content);

      expect(result.tasks[1].noteLines).toEqual([
        '    Level 3 - notes',
        '      Level 4 - still notes',
        '        Level 5 - also notes',
      ]);
    });

    it('should capture notes with flexible indentation', () => {
      const content = `- [ ] Project Setup
  - [ ] Initialize repository
git init
npm init -y

Add .gitignore:
node_modules/
dist/
.env

  - [ ] Install dependencies
npm install express
npm install -D typescript @types/node
    
    Configure tsconfig.json
- [ ] Another parent task`;

      const result = parseMarkdownTasks(content);

      expect(result.tasks).toHaveLength(4); // 2 parent tasks + 2 subtasks

      // First subtask should have git commands as notes
      expect(result.tasks[1].title).toBe('Initialize repository');
      expect(result.tasks[1].noteLines).toEqual([
        'git init',
        'npm init -y',
        '',
        'Add .gitignore:',
        'node_modules/',
        'dist/',
        '.env',
      ]);

      // Second subtask should have npm commands as notes
      expect(result.tasks[2].title).toBe('Install dependencies');
      expect(result.tasks[2].noteLines).toEqual([
        'npm install express',
        'npm install -D typescript @types/node',
        '    ',
        '    Configure tsconfig.json',
      ]);
    });
  });
});
