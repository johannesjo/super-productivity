#!/usr/bin/env node
/**
 * Detailed example of bidirectional sync algorithm
 * This demonstrates how the sync logic handles various scenarios
 */

import { BidirectionalSync } from './src/syncLogic';
import { Task, SyncDirection } from './src/types';

// Helper to visualize sync operations
class SyncVisualizer {
  static visualizeSync(
    markdownBefore: string,
    markdownAfter: string,
    projectBefore: Task[],
    projectAfter: Task[],
    syncResult: any,
  ) {
    console.log('\n📄 MARKDOWN FILE:');
    console.log('Before:', markdownBefore.trim());
    console.log('After:', markdownAfter.trim());

    console.log('\n📋 PROJECT TASKS:');
    console.log(
      'Before:',
      projectBefore.map((t) => `${t.isDone ? '✓' : '○'} ${t.title}`).join(', '),
    );
    console.log(
      'After:',
      projectAfter.map((t) => `${t.isDone ? '✓' : '○'} ${t.title}`).join(', '),
    );

    console.log('\n🔄 SYNC RESULT:');
    console.log(
      `Added: ${syncResult.tasksAdded}, Updated: ${syncResult.tasksUpdated}, Deleted: ${syncResult.tasksDeleted}`,
    );
    if (syncResult.conflicts.length > 0) {
      console.log(
        '⚠️  Conflicts:',
        syncResult.conflicts.map((c) => c.taskTitle).join(', '),
      );
    }
  }
}

// Example 1: Simple bidirectional sync with no conflicts
async function example1_NoConflicts() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 1: Bidirectional Sync - No Conflicts');
  console.log('='.repeat(60));

  const sync = new BidirectionalSync();

  // Initial state
  const initialMarkdown = `
- [ ] Write tests
- [ ] Implement feature
- [x] Review code
`;

  const initialTasks: Task[] = [
    { id: '1', title: 'Write tests', isDone: false, projectId: 'p1' },
    { id: '2', title: 'Implement feature', isDone: false, projectId: 'p1' },
    { id: '3', title: 'Review code', isDone: true, projectId: 'p1' },
  ];

  // Establish baseline
  await sync.sync(initialMarkdown, initialTasks, 'bidirectional');
  const syncState = sync.updateSyncState(initialMarkdown, initialTasks);

  // Changes: Mark "Write tests" as done in markdown, add new task in project
  const updatedMarkdown = `
- [x] Write tests
- [ ] Implement feature
- [x] Review code
`;

  const updatedTasks: Task[] = [
    ...initialTasks,
    { id: '4', title: 'Deploy to staging', isDone: false, projectId: 'p1' },
  ];

  // Perform sync
  const result = await sync.sync(
    updatedMarkdown,
    updatedTasks,
    'bidirectional',
    syncState,
  );

  // Visualize
  SyncVisualizer.visualizeSync(
    initialMarkdown,
    '- [x] Write tests\n- [ ] Implement feature\n- [x] Review code\n- [ ] Deploy to staging',
    initialTasks,
    updatedTasks.map((t) => (t.id === '1' ? { ...t, isDone: true } : t)),
    result,
  );
}

// Example 2: Bidirectional sync with conflicts
async function example2_WithConflicts() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 2: Bidirectional Sync - With Conflicts');
  console.log('='.repeat(60));

  const sync = new BidirectionalSync();

  // Initial state
  const initialMarkdown = `
- [ ] Design API
- [ ] Write documentation
`;

  const initialTasks: Task[] = [
    { id: '1', title: 'Design API', isDone: false, projectId: 'p1' },
    { id: '2', title: 'Write documentation', isDone: false, projectId: 'p1' },
  ];

  // Establish baseline
  await sync.sync(initialMarkdown, initialTasks, 'bidirectional');
  const syncState = sync.updateSyncState(initialMarkdown, initialTasks);

  // Conflicting changes: Both sides modify the same task differently
  const updatedMarkdown = `
- [x] Design REST API
- [ ] Write documentation
`;

  const updatedTasks: Task[] = [
    { id: '1', title: 'Design GraphQL API', isDone: true, projectId: 'p1' },
    { id: '2', title: 'Write documentation', isDone: false, projectId: 'p1' },
  ];

  // Perform sync
  const result = await sync.sync(
    updatedMarkdown,
    updatedTasks,
    'bidirectional',
    syncState,
  );

  console.log('\n🔍 Conflict Details:');
  result.conflicts.forEach((conflict) => {
    console.log(`\nTask: "${conflict.taskTitle}"`);
    console.log(
      `  File version: ${conflict.fileValue.title} (${conflict.fileValue.isDone ? 'done' : 'pending'})`,
    );
    console.log(
      `  Project version: ${conflict.projectValue.title} (${conflict.projectValue.isDone ? 'done' : 'pending'})`,
    );
    console.log(`  Resolution needed: User must choose which version to keep`);
  });
}

// Example 3: Complex hierarchy sync
async function example3_HierarchicalSync() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 3: Hierarchical Task Sync');
  console.log('='.repeat(60));

  const sync = new BidirectionalSync();

  const markdownWithHierarchy = `
- [ ] Build feature
  - [x] Design architecture
  - [ ] Implement backend
    - [x] Create API endpoints
    - [ ] Add database migrations
  - [ ] Implement frontend
- [x] Write tests
  - [x] Unit tests
  - [x] Integration tests
`;

  const projectTasks: Task[] = [
    {
      id: '1',
      title: 'Build feature',
      isDone: false,
      projectId: 'p1',
      subTaskIds: ['1.1', '1.2', '1.3'],
    },
    {
      id: '1.1',
      title: 'Design architecture',
      isDone: true,
      projectId: 'p1',
      parentId: '1',
    },
    {
      id: '1.2',
      title: 'Implement backend',
      isDone: false,
      projectId: 'p1',
      parentId: '1',
      subTaskIds: ['1.2.1', '1.2.2'],
    },
    {
      id: '1.2.1',
      title: 'Create API endpoints',
      isDone: true,
      projectId: 'p1',
      parentId: '1.2',
    },
    {
      id: '1.2.2',
      title: 'Add database migrations',
      isDone: false,
      projectId: 'p1',
      parentId: '1.2',
    },
    {
      id: '1.3',
      title: 'Implement frontend',
      isDone: false,
      projectId: 'p1',
      parentId: '1',
    },
    {
      id: '2',
      title: 'Write tests',
      isDone: true,
      projectId: 'p1',
      subTaskIds: ['2.1', '2.2'],
    },
    { id: '2.1', title: 'Unit tests', isDone: true, projectId: 'p1', parentId: '2' },
    {
      id: '2.2',
      title: 'Integration tests',
      isDone: true,
      projectId: 'p1',
      parentId: '2',
    },
  ];

  const result = await sync.sync(markdownWithHierarchy, projectTasks, 'bidirectional');

  console.log('\n📊 Hierarchy Analysis:');
  console.log('Total tasks processed:', projectTasks.length);
  console.log('Root tasks:', projectTasks.filter((t) => !t.parentId).length);
  console.log('Subtasks:', projectTasks.filter((t) => t.parentId).length);
  console.log('\nSync Result:', result);
}

// Example 4: Demonstrating sync direction differences
async function example4_SyncDirections() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 4: Different Sync Directions');
  console.log('='.repeat(60));

  const markdown = `
- [ ] Task in markdown only
- [x] Shared task
`;

  const tasks: Task[] = [
    { id: '1', title: 'Shared task', isDone: false, projectId: 'p1' }, // Different state
    { id: '2', title: 'Task in project only', isDone: false, projectId: 'p1' },
  ];

  // Test each sync direction
  for (const direction of [
    'fileToProject',
    'projectToFile',
    'bidirectional',
  ] as SyncDirection[]) {
    console.log(`\n📍 Sync Direction: ${direction}`);
    const sync = new BidirectionalSync();
    const result = await sync.sync(markdown, tasks, direction);

    console.log('Result:', result);

    if (direction === 'fileToProject') {
      console.log('→ Markdown is source of truth: project will be updated to match file');
    } else if (direction === 'projectToFile') {
      console.log('→ Project is source of truth: file will be updated to match project');
    } else {
      console.log('→ Both sides matter: conflicts will be detected for resolution');
    }
  }
}

// Example 5: Real-world sync scenario
async function example5_RealWorldScenario() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 5: Real-World Sync Scenario');
  console.log('='.repeat(60));

  console.log(
    '\nScenario: Developer working on a feature while syncing with team project\n',
  );

  const sync = new BidirectionalSync();

  // Morning: Developer creates local markdown file
  const morningMarkdown = `
# Sprint 23 Tasks

- [ ] Implement user authentication
  - [ ] Create login endpoint
  - [ ] Add JWT validation
  - [ ] Setup refresh tokens
- [ ] Fix navigation bug
- [ ] Update documentation
`;

  const morningProjectTasks: Task[] = [];

  console.log('🌅 Morning: Developer creates tasks in markdown');
  let result = await sync.sync(morningMarkdown, morningProjectTasks, 'fileToProject');
  console.log(`→ ${result.tasksAdded} tasks will be added to project\n`);

  // Afternoon: Team member adds tasks to project
  const afternoonProjectTasks: Task[] = [
    {
      id: '1',
      title: 'Implement user authentication',
      isDone: false,
      projectId: 'p1',
      subTaskIds: ['1.1', '1.2', '1.3'],
    },
    {
      id: '1.1',
      title: 'Create login endpoint',
      isDone: true,
      projectId: 'p1',
      parentId: '1',
    }, // Marked as done
    {
      id: '1.2',
      title: 'Add JWT validation',
      isDone: false,
      projectId: 'p1',
      parentId: '1',
    },
    {
      id: '1.3',
      title: 'Setup refresh tokens',
      isDone: false,
      projectId: 'p1',
      parentId: '1',
    },
    { id: '2', title: 'Fix navigation bug', isDone: true, projectId: 'p1' }, // Marked as done
    { id: '3', title: 'Update documentation', isDone: false, projectId: 'p1' },
    { id: '4', title: 'Review PR #123', isDone: false, projectId: 'p1' }, // New task added by team
  ];

  // Developer also makes changes
  const afternoonMarkdown = `
# Sprint 23 Tasks

- [ ] Implement user authentication
  - [x] Create login endpoint
  - [ ] Add JWT validation
  - [ ] Setup refresh tokens
  - [ ] Add rate limiting
- [ ] Fix navigation bug
- [x] Update documentation
`;

  console.log('☀️  Afternoon: Both developer and team made changes');
  const syncState = sync.updateSyncState(morningMarkdown, []);
  result = await sync.sync(
    afternoonMarkdown,
    afternoonProjectTasks,
    'bidirectional',
    syncState,
  );

  console.log('\n📊 Sync Analysis:');
  console.log(`- Tasks added: ${result.tasksAdded}`);
  console.log(`- Tasks updated: ${result.tasksUpdated}`);
  console.log(`- Conflicts: ${result.conflicts.length}`);

  if (result.conflicts.length > 0) {
    console.log('\n⚠️  Conflicts that need resolution:');
    result.conflicts.forEach((c) => {
      console.log(
        `  - "${c.taskTitle}": File says ${c.fileValue.isDone ? 'done' : 'pending'}, Project says ${c.projectValue.isDone ? 'done' : 'pending'}`,
      );
    });
  }
}

// Run all examples
async function runAllExamples() {
  console.log('🔄 BIDIRECTIONAL SYNC EXAMPLES');
  console.log('================================');

  await example1_NoConflicts();
  await example2_WithConflicts();
  await example3_HierarchicalSync();
  await example4_SyncDirections();
  await example5_RealWorldScenario();

  console.log('\n✅ All examples completed!');
}

// Run examples
runAllExamples();
