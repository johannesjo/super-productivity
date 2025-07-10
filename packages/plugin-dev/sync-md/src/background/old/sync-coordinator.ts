import { SyncConfig } from '../shared/types';
import { parseMarkdownTasks } from './markdown-parser';
import { generateTaskOperations } from './sync-utils';
import { PluginFileOperations } from './helper/file-operations';
import { SyncResult } from './models/sync.model';
import { FileOperations } from './models/file-operations.model';

export class SyncCoordinator {
  private fileOps: FileOperations;
  private config: SyncConfig;
  private lastWriteTime: number = 0;
  private readonly WRITE_SETTLE_TIME = 1000; // 1 second to consider our own writes

  constructor(config: SyncConfig) {
    this.config = config;
    this.fileOps = new PluginFileOperations(PluginAPI);
  }

  /**
   * Check if a file change was caused by our own write
   */
  isOwnWrite(fileModifiedTime: number): boolean {
    return fileModifiedTime - this.lastWriteTime < this.WRITE_SETTLE_TIME;
  }

  /**
   * Sync from markdown file to Super Productivity
   */
  async syncFileToSP(): Promise<SyncResult> {
    try {
      console.log('📥 Syncing: Markdown → SuperProductivity');

      // Read and parse markdown file
      const content = await this.fileOps.readFile(this.config.filePath);
      const { tasks: mdTasks, errors } = parseMarkdownTasks(content);

      if (errors.length > 0) {
        console.warn('⚠️ Markdown parsing errors:', errors);
      }

      // Get current SP state
      const [spTasks] = await Promise.all([
        PluginAPI.getTasks(),
        PluginAPI.getAllProjects(),
      ]);

      // Generate operations to sync MD -> SP
      const operations = generateTaskOperations(
        mdTasks,
        spTasks.filter(
          (t: unknown) =>
            (t as { projectId: string }).projectId === this.config.projectId,
        ),
        this.config.projectId,
      );

      if (operations.length === 0) {
        console.log('✅ No changes needed - MD and SP are in sync');
        return { success: true, taskCount: mdTasks.length, type: 'file-to-sp' };
      }

      // Apply operations to SP
      await PluginAPI.batchUpdateForProject({
        projectId: this.config.projectId,
        operations,
      });

      console.log(`✅ Applied ${operations.length} operations to SP`);
      return {
        success: true,
        taskCount: mdTasks.length,
        type: 'file-to-sp',
      };
    } catch (error) {
      console.error('❌ Error syncing file to SP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'file-to-sp',
      };
    }
  }

  /**
   * Sync from Super Productivity to markdown file
   */
  async syncSPToFile(): Promise<SyncResult> {
    try {
      console.log('📤 Syncing: SuperProductivity → Markdown');

      // Get current SP state
      const [tasks, projects] = await Promise.all([
        PluginAPI.getTasks(),
        PluginAPI.getAllProjects(),
      ]);

      const project = projects.find(
        (p: unknown) => (p as { id: string }).id === this.config.projectId,
      );
      if (!project) {
        throw new Error(`Project ${this.config.projectId} not found`);
      }

      // Filter tasks for this project
      const projectTasks = tasks.filter(
        (t: unknown) => (t as { projectId: string }).projectId === this.config.projectId,
      );

      // Convert to markdown content
      const content = this.generateMarkdownContent(projectTasks, project);

      // Write to file
      await this.fileOps.writeFile(this.config.filePath, content);
      this.lastWriteTime = Date.now();

      console.log(`✅ Wrote ${projectTasks.length} tasks to markdown`);
      return {
        success: true,
        taskCount: projectTasks.length,
        type: 'sp-to-file',
      };
    } catch (error) {
      console.error('❌ Error syncing SP to file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'sp-to-file',
      };
    }
  }

  /**
   * Check integrity between SP and markdown file
   */
  async checkIntegrity(): Promise<SyncResult> {
    try {
      console.log('🔍 Checking integrity between SP and markdown');

      // Read current file
      const content = await this.fileOps.readFile(this.config.filePath);
      const { tasks: mdTasks } = parseMarkdownTasks(content);

      // Get SP tasks
      const spTasks = await PluginAPI.getTasks();
      const projectTasks = spTasks.filter((t: unknown) => {
        const task = t as { projectId: string; parentId?: string };
        return task.projectId === this.config.projectId && !task.parentId;
      });

      // Compare counts first
      const mdRootTasks = mdTasks.filter((t) => !t.isSubtask);
      if (mdRootTasks.length !== projectTasks.length) {
        const error = `Task count mismatch: MD has ${mdRootTasks.length}, SP has ${projectTasks.length}`;
        console.error('❌ ' + error);
        return { success: false, error, type: 'integrity-check' };
      }

      // Check each task
      const mdTaskMap = new Map(mdRootTasks.map((t) => [t.title, t]));
      const spTaskMap = new Map(
        projectTasks.map((t: unknown) => {
          const task = t as { title: string };
          return [task.title, task];
        }),
      );

      const differences: string[] = [];

      // Check for missing/extra tasks
      for (const [title] of mdTaskMap) {
        if (!spTaskMap.has(title)) {
          differences.push(`Task "${title}" exists in MD but not in SP`);
        }
      }

      for (const [title] of spTaskMap) {
        if (!mdTaskMap.has(title)) {
          differences.push(`Task "${title}" exists in SP but not in MD`);
        }
      }

      if (differences.length > 0) {
        const error = `Integrity check failed: ${differences.join('; ')}`;
        console.error('❌ ' + error);
        return { success: false, error, type: 'integrity-check' };
      }

      console.log('✅ Integrity check passed');
      return { success: true, type: 'integrity-check' };
    } catch (error) {
      console.error('❌ Error checking integrity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'integrity-check',
      };
    }
  }

  /**
   * Generate markdown content from SP tasks
   */
  private generateMarkdownContent(tasks: unknown[], project: unknown): string {
    const lines: string[] = [];
    const typedProject = project as { taskIds: string[] };

    // Get root tasks in order
    const rootTasks = typedProject.taskIds
      .map((id: string) => tasks.find((t) => (t as { id: string }).id === id))
      .filter(Boolean);

    for (const task of rootTasks) {
      const typedTask = task as {
        id?: string;
        isDone: boolean;
        title: string;
        notes?: string;
        subTaskIds?: string[];
      };

      // Add parent task
      const parentLine =
        `- [${typedTask.isDone ? 'x' : ' '}] ${typedTask.id ? `<!--${typedTask.id}-->` : ''} ${typedTask.title}`.trim();
      lines.push(parentLine);

      // Add parent notes
      if (typedTask.notes) {
        lines.push(...typedTask.notes.split('\n'));
      }

      // Add subtasks
      if (typedTask.subTaskIds && typedTask.subTaskIds.length > 0) {
        for (const subId of typedTask.subTaskIds) {
          const subtask = tasks.find((t) => (t as { id: string }).id === subId);
          if (subtask) {
            const typedSubtask = subtask as {
              id?: string;
              isDone: boolean;
              title: string;
              notes?: string;
            };
            const subLine =
              `  - [${typedSubtask.isDone ? 'x' : ' '}] ${typedSubtask.id ? `<!--${typedSubtask.id}-->` : ''} ${typedSubtask.title}`.trim();
            lines.push(subLine);

            // Add subtask notes
            if (typedSubtask.notes) {
              lines.push(...typedSubtask.notes.split('\n').map((line) => '    ' + line));
            }
          }
        }
      }
    }

    return lines.join('\n');
  }
}
