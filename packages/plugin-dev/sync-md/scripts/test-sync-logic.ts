#!/usr/bin/env node
/**
 * Test script for bidirectional sync logic
 * Run with: npx tsx test-sync-logic.ts
 */

import { BidirectionalSync, SyncState } from './src/syncLogic';
import { Task, MarkdownTask, SyncDirection } from '../src/types';

// Test data
const markdownContent1 = `
- [ ] Design new feature
  - [x] Research requirements
  - [ ] Create mockups
- [x] Fix bug in login
- [ ] Write documentation
`;

const markdownContent2 = `
- [ ] Design new feature
  - [x] Research requirements
  - [x] Create mockups
  - [ ] Get feedback
- [x] Fix bug in login
- [ ] Write documentation
- [ ] Deploy to staging
`;

const projectTasks1: Task[] = [
  {
    id: '1',
    title: 'Design new feature',
    isDone: false,
    projectId: 'proj1',
    subTaskIds: ['1-1', '1-2'],
  },
  {
    id: '1-1',
    title: 'Research requirements',
    isDone: true,
    projectId: 'proj1',
    parentId: '1',
  },
  {
    id: '1-2',
    title: 'Create mockups',
    isDone: false,
    projectId: 'proj1',
    parentId: '1',
  },
  {
    id: '2',
    title: 'Fix bug in login',
    isDone: true,
    projectId: 'proj1',
  },
  {
    id: '3',
    title: 'Write documentation',
    isDone: false,
    projectId: 'proj1',
  },
];

const projectTasks2: Task[] = [
  ...projectTasks1.map((t) => (t.id === '1-2' ? { ...t, isDone: true } : t)),
  {
    id: '4',
    title: 'Review code',
    isDone: false,
    projectId: 'proj1',
  },
];

// Test functions
async function testFileToProjectSync() {
  console.log('\n=== Testing File to Project Sync ===');
  const sync = new BidirectionalSync();

  const result = await sync.sync(markdownContent2, projectTasks1, 'fileToProject');

  console.log('Sync Result:', result);
  console.log(
    'Expected: 1 task added (Deploy to staging), 1 updated (Create mockups), 0 deleted',
  );
}

async function testProjectToFileSync() {
  console.log('\n=== Testing Project to File Sync ===');
  const sync = new BidirectionalSync();

  const result = await sync.sync(markdownContent1, projectTasks2, 'projectToFile');

  console.log('Sync Result:', result);
  console.log(
    'Expected: 1 task added (Review code), 1 updated (Create mockups), 0 deleted',
  );
}

async function testBidirectionalSync() {
  console.log('\n=== Testing Bidirectional Sync ===');
  const sync = new BidirectionalSync();

  // First sync to establish baseline
  console.log('Initial sync...');
  const result1 = await sync.sync(markdownContent1, projectTasks1, 'bidirectional');
  console.log('Initial sync result:', result1);

  // Save sync state
  const syncState = sync.updateSyncState(markdownContent1, projectTasks1);

  // Now test with changes on both sides
  console.log('\nSecond sync with changes on both sides...');
  const sync2 = new BidirectionalSync();
  const result2 = await sync2.sync(
    markdownContent2,
    projectTasks2,
    'bidirectional',
    syncState,
  );

  console.log('Sync Result:', result2);
  console.log('Expected: Changes detected on both sides, potential conflicts');
}

async function testConflictDetection() {
  console.log('\n=== Testing Conflict Detection ===');

  // Create conflicting changes
  const markdownWithConflict = `
- [ ] Design new feature
  - [x] Research requirements
  - [ ] Create wireframes
- [x] Fix bug in authentication
- [ ] Write documentation
`;

  const projectWithConflict: Task[] = [
    {
      id: '1',
      title: 'Design new feature',
      isDone: false,
      projectId: 'proj1',
      subTaskIds: ['1-1', '1-2'],
    },
    {
      id: '1-1',
      title: 'Research requirements',
      isDone: true,
      projectId: 'proj1',
      parentId: '1',
    },
    {
      id: '1-2',
      title: 'Create prototypes',
      isDone: false,
      projectId: 'proj1',
      parentId: '1',
    },
    {
      id: '2',
      title: 'Fix bug in authorization',
      isDone: true,
      projectId: 'proj1',
    },
    {
      id: '3',
      title: 'Write documentation',
      isDone: false,
      projectId: 'proj1',
    },
  ];

  const sync = new BidirectionalSync();

  // First sync
  await sync.sync(markdownContent1, projectTasks1, 'bidirectional');
  const syncState = sync.updateSyncState(markdownContent1, projectTasks1);

  // Second sync with conflicts
  const sync2 = new BidirectionalSync();
  const result = await sync2.sync(
    markdownWithConflict,
    projectWithConflict,
    'bidirectional',
    syncState,
  );

  console.log('Sync Result:', result);
  console.log('Conflicts detected:', result.conflicts.length);
  result.conflicts.forEach((conflict) => {
    console.log(`- Conflict in task "${conflict.taskTitle}"`);
    console.log(`  File value:`, conflict.fileValue);
    console.log(`  Project value:`, conflict.projectValue);
  });
}

async function testMarkdownParsing() {
  console.log('\n=== Testing Markdown Parsing ===');

  const complexMarkdown = `
# Project Tasks

- [ ] Main task 1
  - [x] Subtask 1.1
  - [ ] Subtask 1.2
    - [x] Sub-subtask 1.2.1
    - [ ] Sub-subtask 1.2.2
  - [ ] Subtask 1.3

Some notes here

- [x] Main task 2
  - [x] Subtask 2.1
  - [x] Subtask 2.2

* [ ] Main task 3 (asterisk format)
  * [x] Subtask 3.1
  * [ ] Subtask 3.2
`;

  const sync = new BidirectionalSync();
  // Access private method through type assertion for testing
  const parsed = (sync as any).parseMarkdown(complexMarkdown);

  console.log('Parsed tasks:', JSON.stringify(parsed, null, 2));
  console.log(`Total main tasks: ${parsed.length}`);
  console.log(`Main task 1 subtasks: ${parsed[0]?.subTasks.length}`);
}

// Run all tests
async function runAllTests() {
  console.log('Starting Sync Logic Tests...');

  try {
    await testMarkdownParsing();
    await testFileToProjectSync();
    await testProjectToFileSync();
    await testBidirectionalSync();
    await testConflictDetection();

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run tests
runAllTests();
