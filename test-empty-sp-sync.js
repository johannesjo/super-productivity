// Test what happens when syncing 4-space indented tasks to empty SP
const content = `- [ ] then i am adding tasks
    - [ ] yeah and sub tasks nicely
    - [ ] or is it?
    - [ ] what is going on?`;

// Simulate parseMarkdown
const lines = content.split('\n');
const tasks = [];
const parentStack = [];
const detectedIndentSize = 4; // From our earlier test

lines.forEach((line, i) => {
  const taskMatch = line.match(/^(\s*)- \[([ x])\]\s*(?:<!--([^>]+)-->\s*)?(.*)$/);

  if (taskMatch) {
    const [, indent, completed, id, title] = taskMatch;
    const indentLevel = indent.length;
    const depth = indentLevel === 0 ? 0 : Math.floor(indentLevel / detectedIndentSize);

    if (depth <= 1) {
      const isSubtask = depth === 1;
      let parentId = null;

      if (isSubtask) {
        for (let j = parentStack.length - 1; j >= 0; j--) {
          if (parentStack[j].indent < indentLevel) {
            parentId = parentStack[j].id;
            break;
          }
        }
      }

      // Clean up stack
      while (
        parentStack.length > 0 &&
        parentStack[parentStack.length - 1].indent >= indentLevel
      ) {
        parentStack.pop();
      }

      const task = {
        line: i,
        title: title.trim(),
        indent: indentLevel,
        depth,
        isSubtask,
        parentId,
        id: null, // No IDs in the markdown
        completed: completed === 'x',
        notes: '',
      };

      tasks.push(task);
      // Important: parentStack uses the task's ID, which is null here!
      parentStack.push({ indent: indentLevel, id: task.id });
    }
  }
});

console.log('Parsed tasks:');
tasks.forEach((task) => {
  console.log(`${task.isSubtask ? '  ' : ''}${task.title}`);
  console.log(`    parentId: ${task.parentId}`);
  console.log(`    id: ${task.id}`);
});

// Now simulate generateTaskOperations with empty SP
const spTasks = []; // Empty SP
const operations = [];

tasks.forEach((mdTask) => {
  // No existing tasks to match, so all will be created
  operations.push({
    type: 'create',
    tempId: `temp_${mdTask.line}`,
    data: {
      title: mdTask.title,
      isDone: mdTask.completed,
      notes: mdTask.notes,
      parentId: mdTask.parentId, // This will be null for subtasks!
    },
  });
});

console.log('\nGenerated operations:');
operations.forEach((op) => {
  console.log(`Create "${op.data.title}" with parentId: ${op.data.parentId}`);
});
