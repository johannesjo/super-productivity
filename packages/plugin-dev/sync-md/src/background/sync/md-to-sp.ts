import { parseMarkdownWithHeader } from './markdown-parser';
import { generateTaskOperations } from './generate-task-operations';
// import { Task } from '@super-productivity/plugin-api';

/**
 * Replicate markdown content to Super Productivity tasks
 * Uses the new generateTaskOperations function for proper bidirectional sync
 */
export const mdToSp = async (
  markdownContent: string,
  projectId: string,
): Promise<void> => {
  // Use parseMarkdownWithHeader to get header, but handle backward compatibility
  const parseResult = parseMarkdownWithHeader(markdownContent);
  const parsedTasks = parseResult.tasks;

  // Get current state
  const currentTasks = await PluginAPI.getTasks();
  const currentProjects = await PluginAPI.getAllProjects();

  if (!currentProjects.find((p) => p.id === projectId)) {
    console.warn(`[sync-md] Project ${projectId} not found, skipping sync`);
    return;
  }

  // Filter tasks for the specific project
  const projectTasks = currentTasks.filter((task) => task.projectId === projectId);

  // Generate operations using the new sync logic
  const operations = generateTaskOperations(parsedTasks, projectTasks, projectId);

  // Execute batch operations
  if (operations.length > 0) {
    console.log(
      `[sync-md] Executing ${operations.length} sync operations for project ${projectId}`,
      operations,
    );

    // Use the operations directly - they already match the expected BatchOperation format
    await PluginAPI.batchUpdateForProject({
      projectId,
      operations,
    });
  }
};
