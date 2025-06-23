#!/usr/bin/env node

import { BidirectionalSync } from './src/syncLogic';

async function testParsing() {
  const sync = new BidirectionalSync();

  const markdown = `
- [ ] Task with dash
  - [x] Subtask with dash
* [ ] Task with asterisk  
  * [x] Subtask with asterisk
`;

  // Access private method for testing
  const parsed = (sync as any).parseMarkdown(markdown);

  console.log('Parsed tasks:');
  parsed.forEach((task, i) => {
    console.log(`${i + 1}. "${task.title}" (${task.isDone ? 'done' : 'pending'})`);
    task.subTasks.forEach((sub, j) => {
      console.log(`   ${j + 1}. "${sub.title}" (${sub.isDone ? 'done' : 'pending'})`);
    });
  });
}

testParsing();
