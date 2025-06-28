#!/usr/bin/env node
/**
 * Test script for sync logic
 * Run with: npx tsx scripts/test-sync-logic-new.ts
 */

import {
  parseMarkdownToTree,
  tasksToTree,
  treeToMarkdown,
  replicateMD,
} from '../src/syncLogic';
import { Task, SyncDirection } from '../src/types';

// Test markdown parsing
function testMarkdownParsing() {
  console.log('\n=== Testing Markdown Parsing ===');

  const markdown = `
- [ ] Design new feature
  - [x] Research requirements
  - [ ] Create mockups
    - [ ] Desktop version
    - [x] Mobile version
- [x] Fix bug in login
- [ ] Write documentation
  - [ ] API docs
  - [ ] User guide
`;

  const tree = parseMarkdownToTree(markdown);
  console.log('Parsed tree:', JSON.stringify(tree, null, 2));

  // Test with IDs
  const markdownWithIds = `
- [ ] (task-1) Design new feature
  - [x] (task-1-1) Research requirements
  - [ ] (task-1-2) Create mockups
- [x] (task-2) Fix bug in login
`;

  const treeWithIds = parseMarkdownToTree(markdownWithIds);
  console.log('\nParsed tree with IDs:', JSON.stringify(treeWithIds, null, 2));
}

// Test task to tree conversion
function testTasksToTree() {
  console.log('\n=== Testing Tasks to Tree Conversion ===');

  const tasks: Task[] = [
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
  ];

  const tree = tasksToTree(tasks);
  console.log('Task tree:', JSON.stringify(tree, null, 2));
}

// Test tree to markdown conversion
function testTreeToMarkdown() {
  console.log('\n=== Testing Tree to Markdown Conversion ===');

  const tasks: Task[] = [
    {
      id: '1',
      title: 'Main task',
      isDone: false,
      projectId: 'proj1',
      subTaskIds: ['2'],
      notes: 'This is a note\nWith multiple lines',
    },
    {
      id: '2',
      title: 'Sub task',
      isDone: true,
      projectId: 'proj1',
      parentId: '1',
    },
  ];

  const tree = tasksToTree(tasks);
  const markdown = treeToMarkdown(tree);
  console.log('Generated markdown:\n', markdown);
}

// Test basic replication
function testBasicReplication() {
  console.log('\n=== Testing Basic Replication ===');

  const markdown = `
- [ ] Task 1
  - [x] Subtask 1
  - [ ] Subtask 2
- [ ] Task 2
`;

  const tasks: Task[] = [
    {
      id: '1',
      title: 'Task 1',
      isDone: false,
      projectId: 'proj1',
      subTaskIds: ['1-1', '1-2'],
    },
    {
      id: '1-1',
      title: 'Subtask 1',
      isDone: false, // Different from markdown
      projectId: 'proj1',
      parentId: '1',
    },
    {
      id: '1-2',
      title: 'Subtask 2',
      isDone: false,
      projectId: 'proj1',
      parentId: '1',
    },
    {
      id: '3',
      title: 'Task 3', // Not in markdown
      isDone: false,
      projectId: 'proj1',
    },
  ];

  // Test file to project sync
  console.log('\n--- File to Project Sync ---');
  const fileToProjectResult = replicateMD(markdown, tasks, 'fileToProject');
  console.log('Result:', {
    success: fileToProjectResult.success,
    tasksAdded: fileToProjectResult.tasksAdded,
    tasksUpdated: fileToProjectResult.tasksUpdated,
    tasksDeleted: fileToProjectResult.tasksDeleted,
    operations: fileToProjectResult.operations,
  });

  // Test project to file sync
  console.log('\n--- Project to File Sync ---');
  const projectToFileResult = replicateMD(markdown, tasks, 'projectToFile');
  console.log('Result:', {
    success: projectToFileResult.success,
    operations: projectToFileResult.operations,
  });
  console.log('Updated markdown:\n', projectToFileResult.updatedMarkdown);
}

// Run all tests
async function runTests() {
  console.log('Starting Sync Logic Tests...');

  try {
    testMarkdownParsing();
    testTasksToTree();
    testTreeToMarkdown();
    testBasicReplication();

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run tests
runTests();
