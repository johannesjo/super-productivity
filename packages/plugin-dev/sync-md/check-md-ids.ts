// Script to check SuperProductivity tasks for markdown IDs in notes field

async function checkTasksForMarkdownIds() {
  console.log('Checking tasks for markdown IDs in notes field...\n');

  // This script should be run in the SuperProductivity plugin context
  if (typeof PluginAPI === 'undefined') {
    console.error('This script must be run within the SuperProductivity plugin context');
    return;
  }

  try {
    // Get all tasks from SuperProductivity
    const tasks = await PluginAPI.getTasks();
    console.log(`Found ${tasks.length} total tasks\n`);

    // Pattern to match markdown IDs in notes
    // Looking for the format: <!-- sp:md-xxx -->
    const mdIdPattern = /<!-- sp:md-(\w+) -->/;

    // Also check for the sync-md plugin format: <!-- sp:id -->
    const spIdPattern = /<!-- sp:([a-zA-Z0-9_-]+) -->/;

    let tasksWithMdIds = 0;
    let tasksWithSpIds = 0;
    let tasksWithNotes = 0;

    console.log('=== Tasks with Markdown IDs ===\n');

    // Check each task for markdown IDs
    for (const task of tasks) {
      if (task.notes) {
        tasksWithNotes++;

        // Check if notes contain markdown ID (md- prefix)
        const mdMatch = task.notes.match(mdIdPattern);
        if (mdMatch) {
          tasksWithMdIds++;
          console.log(`Task "${task.title}" (Task ID: ${task.id})`);
          console.log(`  - Markdown ID: md-${mdMatch[1]}`);
          console.log(`  - Full match: ${mdMatch[0]}`);
          console.log(`  - Notes preview: ${task.notes.substring(0, 200)}...`);
          console.log('');
        }

        // Check for any sp: ID pattern
        const spMatch = task.notes.match(spIdPattern);
        if (spMatch && !mdMatch) {
          // Don't double count
          tasksWithSpIds++;
          console.log(`Task "${task.title}" (Task ID: ${task.id})`);
          console.log(`  - SP ID: ${spMatch[1]}`);
          console.log(`  - Full match: ${spMatch[0]}`);
          console.log(`  - Notes preview: ${task.notes.substring(0, 200)}...`);
          console.log('');
        }
      }
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Total tasks: ${tasks.length}`);
    console.log(`Tasks with notes: ${tasksWithNotes}`);
    console.log(`Tasks with markdown IDs (<!-- sp:md-xxx -->): ${tasksWithMdIds}`);
    console.log(`Tasks with SP IDs (<!-- sp:xxx -->): ${tasksWithSpIds}`);
    console.log(`Total tasks with any ID: ${tasksWithMdIds + tasksWithSpIds}`);

    // Check for other potential patterns
    console.log('\n=== Checking for other potential patterns ===');
    const otherPatterns = [
      { pattern: /<!--.*md.*-->/i, description: 'Any HTML comment with "md"' },
      { pattern: /\[md-id:.*\]/i, description: 'Square bracket format [md-id:...]' },
      { pattern: /md-sync-id:/i, description: 'md-sync-id: format' },
      { pattern: /markdown-id:/i, description: 'markdown-id: format' },
      { pattern: /<!-- sync-md:.*-->/i, description: 'sync-md comment format' },
      { pattern: /@md-id:/i, description: '@md-id: format' },
    ];

    for (const { pattern, description } of otherPatterns) {
      let count = 0;
      const examples: string[] = [];

      for (const task of tasks) {
        if (task.notes && pattern.test(task.notes)) {
          count++;
          if (examples.length < 3) {
            // Show first 3 examples
            const match = task.notes.match(pattern);
            if (match) {
              examples.push(`  - Task "${task.title}": ${match[0]}`);
            }
          }
        }
      }

      if (count > 0) {
        console.log(`\n${description}: found in ${count} tasks`);
        if (examples.length > 0) {
          console.log('Examples:');
          examples.forEach((ex) => console.log(ex));
        }
      }
    }

    // Show tasks without any ID pattern (if they have notes)
    console.log('\n=== Tasks with notes but no ID pattern ===');
    let countNoId = 0;
    for (const task of tasks) {
      if (task.notes && !spIdPattern.test(task.notes)) {
        countNoId++;
        if (countNoId <= 5) {
          // Show first 5
          console.log(`\nTask "${task.title}" (ID: ${task.id})`);
          console.log(`Notes: ${task.notes.substring(0, 100)}...`);
        }
      }
    }
    if (countNoId > 5) {
      console.log(`\n... and ${countNoId - 5} more tasks with notes but no ID pattern`);
    }
  } catch (error) {
    console.error('Error checking tasks:', error);
  }
}

// Run the check if in plugin context
if (typeof PluginAPI !== 'undefined') {
  checkTasksForMarkdownIds();
} else {
  console.log('This script needs to be run within the SuperProductivity plugin context');
}

export { checkTasksForMarkdownIds };
