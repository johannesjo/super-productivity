import {
  MarkdownTask,
  ReplicationResult,
  SPUpdate,
  SuperProductivityTask,
} from './types';
import { generateTaskId } from './generateTaskId';
import { createMarkdownLine } from './createMarkdownLine';

/**
 * Main replication function - compares two states and returns updates for both
 * @param markdownContent Original markdown content
 * @param markdownTasks Parsed markdown tasks
 * @param spTasks SuperProductivity tasks
 * @param projectId Project ID for new tasks
 * @returns Updated markdown content and SP updates
 */
export const replicateTasks = (
  markdownContent: string,
  markdownTasks: MarkdownTask[],
  spTasks: SuperProductivityTask[],
  projectId: string,
): ReplicationResult => {
  const spUpdates: SPUpdate[] = [];
  const stats = { created: 0, updated: 0, deleted: 0 };

  // Create lookup maps
  const spTaskMap = new Map(spTasks.map((t) => [t.id, t]));
  const mdTaskMap = new Map<string, MarkdownTask>();
  const mdTasksWithoutId: MarkdownTask[] = [];

  // Separate markdown tasks by ID presence
  markdownTasks.forEach((mdTask) => {
    if (mdTask.id) {
      mdTaskMap.set(mdTask.id, mdTask);
    } else {
      mdTasksWithoutId.push(mdTask);
    }
  });

  // Track line updates
  const lineUpdates = new Map<number, string>();

  // Step 1: Process markdown tasks with IDs
  mdTaskMap.forEach((mdTask, id) => {
    const spTask = spTaskMap.get(id);

    if (spTask) {
      // Task exists in both - check for updates
      if (mdTask.title !== spTask.title || mdTask.isDone !== spTask.isDone) {
        spUpdates.push({
          type: 'update',
          id: id,
          task: {
            title: mdTask.title,
            isDone: mdTask.isDone,
          },
        });
        stats.updated++;
      }

      // Remove from SP map to track what needs deletion
      spTaskMap.delete(id);
    } else {
      // Task has ID but doesn't exist in SP - create it
      spUpdates.push({
        type: 'create',
        task: {
          id: id,
          title: mdTask.title,
          isDone: mdTask.isDone,
          projectId: projectId,
        },
      });
      stats.created++;
    }
  });

  // Step 2: Process markdown tasks without IDs
  mdTasksWithoutId.forEach((mdTask) => {
    // Generate new ID
    const newId = generateTaskId();

    // Create in SuperProductivity
    spUpdates.push({
      type: 'create',
      task: {
        id: newId,
        title: mdTask.title,
        isDone: mdTask.isDone,
        projectId: projectId,
      },
    });
    stats.created++;

    // Update markdown line with ID
    lineUpdates.set(mdTask.lineNumber, createMarkdownLine(mdTask, newId));
  });

  // Step 3: Delete SP tasks not in markdown
  spTaskMap.forEach((spTask) => {
    spUpdates.push({
      type: 'delete',
      id: spTask.id,
    });
    stats.deleted++;
  });

  // Apply line updates to markdown content
  const updatedMarkdown = applyLineUpdates(markdownContent, lineUpdates);

  return {
    markdownContent: updatedMarkdown,
    superProductivityUpdates: spUpdates,
    stats,
  };
};

/**
 * Apply line updates to markdown content
 */
function applyLineUpdates(content: string, updates: Map<number, string>): string {
  if (updates.size === 0) {
    return content;
  }

  const lines = content.split('\n');

  updates.forEach((newLine, lineNumber) => {
    if (lineNumber < lines.length) {
      lines[lineNumber] = newLine;
    }
  });

  return lines.join('\n');
}
