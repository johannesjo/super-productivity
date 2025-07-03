/**
 * Script to inspect SuperProductivity tasks and their markdown sync IDs
 * This script checks how tasks are linked to markdown files through IDs stored in their notes
 */

interface TaskInfo {
  id: string;
  title: string;
  notes?: string;
  parentId?: string | null;
  projectId?: string;
  tagIds?: string[];
  isDone: boolean;
}

interface MarkdownIdInfo {
  taskId: string;
  taskTitle: string;
  markdownId: string;
  fullMatch: string;
  notesPreview: string;
}

async function inspectMarkdownSync() {
  console.log('=== SuperProductivity Markdown Sync Inspection ===\n');

  // Check if running in plugin context
  if (typeof PluginAPI === 'undefined') {
    console.error(
      'ERROR: This script must be run within the SuperProductivity plugin context',
    );
    console.error(
      'Please run this script through the sync-md plugin in SuperProductivity',
    );
    return;
  }

  try {
    // Get all tasks and projects
    const [tasks, projects] = await Promise.all([
      PluginAPI.getTasks() as Promise<TaskInfo[]>,
      PluginAPI.getAllProjects(),
    ]);

    console.log(`Total tasks found: ${tasks.length}`);
    console.log(`Total projects found: ${projects.length}\n`);

    // Pattern to match the sync-md plugin format: <!-- sp:id -->
    const spIdPattern = /<!-- sp:([a-zA-Z0-9_-]+) -->/g;

    const tasksWithIds: MarkdownIdInfo[] = [];
    let tasksWithNotes = 0;
    let totalMatches = 0;

    // Analyze each task
    for (const task of tasks) {
      if (task.notes) {
        tasksWithNotes++;

        // Find all matches in notes (there could be multiple)
        const matches = [...task.notes.matchAll(spIdPattern)];

        for (const match of matches) {
          totalMatches++;
          tasksWithIds.push({
            taskId: task.id,
            taskTitle: task.title,
            markdownId: match[1],
            fullMatch: match[0],
            notesPreview: task.notes.substring(0, 150).replace(/\n/g, ' '),
          });
        }
      }
    }

    // Display results
    console.log('=== Tasks with Markdown Sync IDs ===\n');

    if (tasksWithIds.length === 0) {
      console.log('No tasks found with markdown sync IDs (<!-- sp:xxx --> format)\n');
    } else {
      // Group by markdown ID to find duplicates
      const idGroups = new Map<string, MarkdownIdInfo[]>();

      for (const info of tasksWithIds) {
        if (!idGroups.has(info.markdownId)) {
          idGroups.set(info.markdownId, []);
        }
        idGroups.get(info.markdownId)!.push(info);
      }

      // Show unique IDs first
      console.log('Unique markdown IDs:');
      let uniqueCount = 0;
      for (const [mdId, infos] of idGroups) {
        if (infos.length === 1) {
          uniqueCount++;
          const info = infos[0];
          console.log(`\n[${uniqueCount}] Task: "${info.taskTitle}"`);
          console.log(`    Task ID: ${info.taskId}`);
          console.log(`    Markdown ID: ${info.markdownId}`);
          console.log(`    Notes: ${info.notesPreview}...`);
        }
      }

      // Show duplicates (if any)
      const duplicates = Array.from(idGroups.entries()).filter(
        ([_, infos]) => infos.length > 1,
      );
      if (duplicates.length > 0) {
        console.log('\n\n⚠️  WARNING: Duplicate markdown IDs found:');
        for (const [mdId, infos] of duplicates) {
          console.log(`\nMarkdown ID "${mdId}" is used by ${infos.length} tasks:`);
          infos.forEach((info, i) => {
            console.log(`  ${i + 1}. "${info.taskTitle}" (Task ID: ${info.taskId})`);
          });
        }
      }
    }

    // Summary statistics
    console.log('\n\n=== Summary Statistics ===');
    console.log(`Total tasks: ${tasks.length}`);
    console.log(
      `Tasks with notes: ${tasksWithNotes} (${((tasksWithNotes / tasks.length) * 100).toFixed(1)}%)`,
    );
    console.log(`Tasks with markdown IDs: ${tasksWithIds.length} unique tasks`);
    console.log(`Total markdown ID occurrences: ${totalMatches}`);

    // Check for orphaned IDs (IDs that don't match task IDs)
    const orphanedIds = tasksWithIds.filter((info) => info.markdownId !== info.taskId);
    if (orphanedIds.length > 0) {
      console.log(
        `\n⚠️  Tasks where markdown ID differs from task ID: ${orphanedIds.length}`,
      );
      console.log('(This might indicate manual edits or sync issues)');
      orphanedIds.slice(0, 5).forEach((info) => {
        console.log(`  - Task ID: ${info.taskId}, Markdown ID: ${info.markdownId}`);
      });
      if (orphanedIds.length > 5) {
        console.log(`  ... and ${orphanedIds.length - 5} more`);
      }
    }

    // Project analysis
    console.log('\n\n=== Markdown IDs by Project ===');
    const projectMap = new Map<string, number>();

    for (const info of tasksWithIds) {
      const task = tasks.find((t) => t.id === info.taskId);
      if (task?.projectId) {
        const project = projects.find((p) => p.id === task.projectId);
        const projectName = project?.title || 'Unknown Project';
        projectMap.set(projectName, (projectMap.get(projectName) || 0) + 1);
      }
    }

    if (projectMap.size > 0) {
      for (const [projectName, count] of projectMap) {
        console.log(`  ${projectName}: ${count} tasks with markdown IDs`);
      }
    } else {
      console.log('  No tasks with markdown IDs are associated with projects');
    }

    // Check for potential issues
    console.log('\n\n=== Potential Issues ===');

    // Check for malformed IDs
    const malformedPatterns = [
      /<!-- sp: [a-zA-Z0-9_-]+ -->/, // Extra space after colon
      /<!-- sp:[a-zA-Z0-9_-]+-->/, // Missing space before -->
      /<!--sp:[a-zA-Z0-9_-]+ -->/, // Missing space after <!--
    ];

    let issuesFound = false;
    for (const pattern of malformedPatterns) {
      const malformed = tasks.filter((t) => t.notes && pattern.test(t.notes));
      if (malformed.length > 0) {
        issuesFound = true;
        console.log(
          `\n⚠️  Found ${malformed.length} tasks with malformed markdown IDs matching ${pattern}`,
        );
        malformed.slice(0, 2).forEach((task) => {
          const match = task.notes!.match(pattern);
          console.log(`  - Task "${task.title}": ${match?.[0]}`);
        });
      }
    }

    if (!issuesFound) {
      console.log('✓ No formatting issues detected');
    }
  } catch (error) {
    console.error('\nERROR: Failed to inspect tasks:', error);
    console.error('Stack trace:', (error as Error).stack);
  }
}

// Export the function
if (typeof window !== 'undefined') {
  (window as any).inspectMarkdownSync = inspectMarkdownSync;
}

// Run automatically if in plugin context
if (typeof PluginAPI !== 'undefined') {
  inspectMarkdownSync().catch(console.error);
}

export { inspectMarkdownSync };
