// Test script to trace 4-space indent parsing
const content = `- [ ] then i am adding tasks
    - [ ] yeah and sub tasks nicely
    - [ ] or is it?
    - [ ] what is going on?`;

// Simulate the parsing logic
const lines = content.split('\n');
const indentCounts = new Map();

// detectIndentSize logic
for (const line of lines) {
  const match = line.match(/^(\s+)- \[/);
  if (match && match[1].length > 0) {
    const indentSize = match[1].length;
    indentCounts.set(indentSize, (indentCounts.get(indentSize) || 0) + 1);
    console.log(`Line: "${line}"`);
    console.log(`  Indent size: ${indentSize} spaces`);
  }
}

console.log('\nIndent counts:', indentCounts);

// Find most common indent
let mostCommonIndent = 2;
let maxCount = 0;

for (const [indent, count] of indentCounts) {
  if (count > maxCount) {
    maxCount = count;
    mostCommonIndent = indent;
  }
}

console.log(`\nDetected indent size: ${mostCommonIndent} spaces`);

// Now trace the parsing
console.log('\n--- Parsing tasks ---');
const detectedIndentSize = mostCommonIndent;
const parentStack = [];
const tasks = [];

lines.forEach((line, i) => {
  const taskMatch = line.match(/^(\s*)- \[([ x])\]\s*(?:<!--([^>]+)-->\s*)?(.*)$/);

  if (taskMatch) {
    const [, indent, completed, id, title] = taskMatch;
    const indentLevel = indent.length;
    const depth = indentLevel === 0 ? 0 : Math.floor(indentLevel / detectedIndentSize);

    console.log(`\nLine ${i + 1}: "${line}"`);
    console.log(`  Indent level: ${indentLevel} spaces`);
    console.log(`  Depth: ${depth}`);
    console.log(`  Is subtask: ${depth === 1}`);

    if (depth <= 1) {
      const isSubtask = depth === 1;
      let parentId = null;

      if (isSubtask) {
        console.log('  Looking for parent in stack:', parentStack);
        for (let j = parentStack.length - 1; j >= 0; j--) {
          if (parentStack[j].indent < indentLevel) {
            parentId = parentStack[j].id;
            console.log(`  Found parent: ${parentId || 'root task'}`);
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
        title: title.trim(),
        indent: indentLevel,
        depth,
        isSubtask,
        parentId,
        id: `task-${i}`,
      };

      tasks.push(task);
      parentStack.push({ indent: indentLevel, id: task.id });

      console.log(`  Created task:`, task);
    }
  }
});

console.log('\n--- Final tasks ---');
tasks.forEach((task) => {
  console.log(
    `${task.isSubtask ? '  ' : ''}${task.title} (parent: ${task.parentId || 'none'})`,
  );
});
