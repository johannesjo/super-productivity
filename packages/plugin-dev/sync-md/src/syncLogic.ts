import {
  Task,
  MarkdownTask,
  SyncDirection,
  SyncResult as BaseSyncResult,
  SyncConflict,
} from './types';

// Tree node structure for both markdown and tasks
export interface TreeNode {
  id?: string;
  title: string;
  isDone: boolean;
  children: TreeNode[];
  notes?: string;
  parentId?: string | null;
  level: number;
}

// Sync operation types
export interface SyncOperation {
  type: 'add' | 'update' | 'delete';
  target: 'task' | 'markdown';
  taskId?: string;
  tempId?: string; // Temporary ID for tracking new tasks
  parentId?: string | null;
  data?: Partial<Task>;
  markdownLine?: number;
}

// Extended sync result structure
export interface ExtendedSyncResult extends BaseSyncResult {
  success: boolean;
  operations: SyncOperation[];
  updatedMarkdown: string;
  error?: string;
}

// Parse markdown checklist to tree structure
export function parseMarkdownToTree(markdown: string): TreeNode[] {
  const lines = markdown.split('\n');
  const rootNodes: TreeNode[] = [];
  const stack: { node: TreeNode; indent: number }[] = [];

  lines.forEach((line, lineIndex) => {
    // Match checkbox items with either - or * as bullet
    const checkboxMatch = line.match(/^(\s*)([-*])\s*\[([ x])\]\s*(.*)$/);
    if (!checkboxMatch) return;

    const [, indent, bullet, checked, text] = checkboxMatch;
    const indentLevel = indent.length;
    const isDone = checked.toLowerCase() === 'x';

    // Extract task ID if present
    const idMatch = text.match(/^\(([^)]+)\)\s*(.+)$/);
    const id = idMatch ? idMatch[1] : undefined;
    const title = idMatch ? idMatch[2] : text;

    const node: TreeNode = {
      id,
      title: title.trim(),
      isDone,
      children: [],
      level: Math.floor(indentLevel / 2), // Assuming 2 spaces per level
    };

    // Find parent based on indentation
    while (stack.length > 0 && stack[stack.length - 1].indent >= indentLevel) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootNodes.push(node);
    } else {
      const parent = stack[stack.length - 1].node;
      parent.children.push(node);
      node.parentId = parent.id || null;
    }

    stack.push({ node, indent: indentLevel });
  });

  // Process notes (lines that should be added to task.notes)
  const processNotes = (nodes: TreeNode[], parentStack: TreeNode[] = []) => {
    nodes.forEach((node) => {
      // Look for child nodes that aren't tasks (potential notes)
      const notesLines: string[] = [];
      const taskChildren: TreeNode[] = [];

      node.children.forEach((child) => {
        // If a child has no checkbox pattern, it might be notes
        // This is handled by the parsing above, so all children here are tasks
        taskChildren.push(child);
      });

      node.children = taskChildren;

      // Recursively process children
      processNotes(node.children, [...parentStack, node]);
    });
  };

  processNotes(rootNodes);

  return rootNodes;
}

// Convert task list to tree structure
export function tasksToTree(tasks: Task[]): TreeNode[] {
  const taskMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];
  const childrenAdded = new Set<string>();

  // First pass: create all nodes
  tasks.forEach((task) => {
    const node: TreeNode = {
      id: task.id,
      title: task.title,
      isDone: task.isDone || false,
      children: [],
      notes: task.notes,
      parentId: task.parentId || null,
      level: 0,
    };
    taskMap.set(task.id, node);
  });

  // Second pass: build tree structure
  tasks.forEach((task) => {
    const node = taskMap.get(task.id)!;

    // Handle parent-child relationships
    if (task.parentId && taskMap.has(task.parentId)) {
      const parent = taskMap.get(task.parentId)!;
      if (!childrenAdded.has(task.id)) {
        parent.children.push(node);
        childrenAdded.add(task.id);
        node.level = parent.level + 1;
      }
    }

    // Handle subtask IDs - maintain order from subTaskIds array
    if (task.subTaskIds && task.subTaskIds.length > 0) {
      // Clear children array to rebuild in correct order
      node.children = [];

      // Add children in the order specified by subTaskIds
      task.subTaskIds.forEach((subTaskId) => {
        const child = taskMap.get(subTaskId);
        if (child && !childrenAdded.has(subTaskId)) {
          node.children.push(child);
          child.parentId = task.id;
          child.level = node.level + 1;
          childrenAdded.add(subTaskId);
        }
      });
    }

    // Add root nodes (tasks without parents and not already added as children)
    if (!task.parentId && !childrenAdded.has(task.id)) {
      rootNodes.push(node);
    }
  });

  return rootNodes;
}

// Convert tree back to markdown
export function treeToMarkdown(
  nodes: TreeNode[],
  level: number = 0,
  includeIds: boolean = false,
): string {
  const lines: string[] = [];

  nodes.forEach((node) => {
    const indent = '  '.repeat(level);
    const checkbox = node.isDone ? '[x]' : '[ ]';
    const id = includeIds && node.id ? `(${node.id}) ` : '';
    const line = `${indent}- ${checkbox} ${id}${node.title}`;
    lines.push(line);

    // Add notes as sub-items if present
    // Only include notes for leaf tasks (tasks without children)
    if (node.notes && node.children.length === 0) {
      const noteLines = node.notes.split('\n').filter((line) => line.trim());
      noteLines.forEach((noteLine) => {
        const trimmedLine = noteLine.trim();
        // Check if the note line is a checklist item
        const checklistMatch = trimmedLine.match(/^[-*]\s*\[([ x])\]\s*(.+)$/);
        if (checklistMatch) {
          const [, checked, text] = checklistMatch;
          const noteCheckbox = checked.toLowerCase() === 'x' ? '[x]' : '[ ]';
          lines.push(`${indent}  - ${noteCheckbox} ${text}`);
        } else {
          // For non-checklist notes, add as plain text sub-item
          lines.push(`${indent}  - ${trimmedLine}`);
        }
      });
    }

    // Recursively add children
    if (node.children.length > 0) {
      lines.push(treeToMarkdown(node.children, level + 1, includeIds));
    }
  });

  return lines.join('\n');
}

// Helper to find matching node
const findMatchingNode = (node: TreeNode, tree: TreeNode[]): TreeNode | null => {
  for (const treeNode of tree) {
    // Match by ID if available
    if (node.id && treeNode.id && node.id === treeNode.id) {
      return treeNode;
    }
    // Otherwise match by title and parent context
    if (node.title === treeNode.title) {
      return treeNode;
    }
    // Recursively search in children
    const found = findMatchingNode(node, treeNode.children);
    if (found) return found;
  }
  return null;
};

// Compare two trees and generate sync operations
export function compareTrees(
  markdownTree: TreeNode[],
  taskTree: TreeNode[],
  direction: SyncDirection,
): SyncOperation[] {
  const operations: SyncOperation[] = [];

  // Process based on sync direction
  if (direction === 'fileToProject' || direction === 'bidirectional') {
    // Process markdown nodes
    const processMarkdownNode = (node: TreeNode, parentId: string | null = null) => {
      const matchingTask = findMatchingNode(node, taskTree);

      if (!matchingTask) {
        // Add new task
        operations.push({
          type: 'add',
          target: 'task',
          parentId,
          data: {
            title: node.title,
            isDone: node.isDone,
            notes: node.notes,
          },
        });
      } else if (
        matchingTask.isDone !== node.isDone ||
        matchingTask.title !== node.title
      ) {
        // Update existing task
        operations.push({
          type: 'update',
          target: 'task',
          taskId: matchingTask.id,
          data: {
            title: node.title,
            isDone: node.isDone,
          },
        });
      }

      // Process children
      node.children.forEach((child) => {
        processMarkdownNode(child, node.id || matchingTask?.id || null);
      });
    };

    markdownTree.forEach((node) => processMarkdownNode(node));
  }

  if (direction === 'projectToFile' || direction === 'bidirectional') {
    // Process task nodes
    const processTaskNode = (node: TreeNode) => {
      const matchingMarkdown = findMatchingNode(node, markdownTree);

      if (!matchingMarkdown) {
        if (direction === 'projectToFile') {
          // Task exists in project but not in markdown - add it
          operations.push({
            type: 'add',
            target: 'markdown',
            taskId: node.id,
            data: {
              title: node.title,
              isDone: node.isDone,
              notes: node.notes,
            },
          });
        } else if (direction === 'bidirectional') {
          // In bidirectional, delete the task from project
          operations.push({
            type: 'delete',
            target: 'task',
            taskId: node.id,
          });
        }
      } else if (
        matchingMarkdown.isDone !== node.isDone ||
        matchingMarkdown.title !== node.title
      ) {
        // Task exists in both but has been modified in project - update markdown
        operations.push({
          type: 'update',
          target: 'markdown',
          taskId: node.id,
          data: {
            title: node.title,
            isDone: node.isDone,
            notes: node.notes,
          },
        });
      }

      // Process children
      node.children.forEach(processTaskNode);
    };

    taskTree.forEach(processTaskNode);

    // Check for markdown nodes that don't exist in project (deleted tasks)
    const processMarkdownNodeForDeletion = (node: TreeNode) => {
      const matchingTask = findMatchingNode(node, taskTree);

      if (!matchingTask) {
        // Task exists in markdown but not in project - remove from markdown
        operations.push({
          type: 'delete',
          target: 'markdown',
          taskId: node.id,
          data: {
            title: node.title,
          },
        });
      }

      // Process children
      node.children.forEach(processMarkdownNodeForDeletion);
    };

    markdownTree.forEach(processMarkdownNodeForDeletion);
  }

  return operations;
}

// Main replication function
export function replicateMD(
  markdownContent: string,
  tasks: Task[],
  direction: SyncDirection,
): ExtendedSyncResult {
  try {
    // Parse both sources to tree structures
    const markdownTree = parseMarkdownToTree(markdownContent);
    const taskTree = tasksToTree(tasks);

    // Compare and generate operations
    const operations = compareTrees(markdownTree, taskTree, direction);

    // Apply operations to generate updated markdown
    let updatedTree = JSON.parse(JSON.stringify(markdownTree)); // Deep clone the tree

    if (direction === 'projectToFile' || direction === 'bidirectional') {
      // Helper function to find a node by ID in the tree
      const findNodeById = (
        id: string | undefined,
        tree: TreeNode[],
      ): TreeNode | null => {
        if (!id) return null;
        for (const node of tree) {
          if (node.id === id) return node;
          const found = findNodeById(id, node.children);
          if (found) return found;
        }
        return null;
      };

      // Helper function to remove a node by ID or title from the tree
      const removeNodeByIdOrTitle = (
        id: string | undefined,
        title: string | undefined,
        tree: TreeNode[],
      ): boolean => {
        if (!id && !title) {
          return false;
        }
        for (let i = 0; i < tree.length; i++) {
          // Try to match by ID first, then by title
          const isMatch = (id && tree[i].id === id) || (title && tree[i].title === title);
          if (isMatch) {
            tree.splice(i, 1);
            return true;
          }
          if (removeNodeByIdOrTitle(id, title, tree[i].children)) return true;
        }
        return false;
      };

      // For projectToFile sync, use SuperProductivity's task order
      if (direction === 'projectToFile') {
        // Helper to build children tree with correct hierarchy
        const buildChildrenTree = (
          children: TreeNode[],
          level: number = 1,
        ): TreeNode[] => {
          return children.map((child) => ({
            id: child.id,
            title: child.title,
            isDone: child.isDone,
            notes: child.notes,
            level: level,
            children: buildChildrenTree(child.children, level + 1),
          }));
        };

        // Use SuperProductivity's task order directly
        updatedTree = taskTree.map((taskNode) => ({
          id: taskNode.id,
          title: taskNode.title,
          isDone: taskNode.isDone,
          notes: taskNode.notes,
          level: 0,
          children: buildChildrenTree(taskNode.children),
        }));
      } else {
        // For bidirectional sync, apply operations incrementally
        operations
          .filter((op) => op.target === 'markdown')
          .forEach((op) => {
            if (op.type === 'add' && op.data) {
              // Add new task to the root of the tree
              const newNode: TreeNode = {
                id: op.taskId,
                title: op.data.title || '',
                isDone: op.data.isDone || false,
                children: [],
                notes: op.data.notes,
                level: 0,
              };
              updatedTree.push(newNode);
            } else if (op.type === 'update' && op.data) {
              // Find and update the existing node
              const node = findNodeById(op.taskId, updatedTree);
              if (node) {
                node.title = op.data.title || node.title;
                node.isDone = op.data.isDone !== undefined ? op.data.isDone : node.isDone;
                if (op.data.notes !== undefined) {
                  node.notes = op.data.notes;
                }
              }
            } else if (op.type === 'delete') {
              // Remove the node from the tree
              removeNodeByIdOrTitle(op.taskId, op.data?.title, updatedTree);
            }
          });
      }
    }

    const updatedMarkdown = treeToMarkdown(updatedTree, 0, false); // Don't include IDs in output

    // Calculate summary statistics
    const tasksAdded = operations.filter(
      (op) => op.type === 'add' && op.target === 'task',
    ).length;
    const tasksUpdated = operations.filter(
      (op) => op.type === 'update' && op.target === 'task',
    ).length;
    const tasksDeleted = operations.filter(
      (op) => op.type === 'delete' && op.target === 'task',
    ).length;

    return {
      success: true,
      operations,
      updatedMarkdown,
      conflicts: [],
      tasksAdded,
      tasksUpdated,
      tasksDeleted,
    };
  } catch (error) {
    return {
      success: false,
      operations: [],
      updatedMarkdown: markdownContent,
      conflicts: [],
      error: error instanceof Error ? error.message : String(error),
      tasksAdded: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
    };
  }
}

// Sync state for tracking changes
export interface SyncState {
  lastSyncTime: number;
  fileChecksum: string;
  taskChecksums: Map<string, string>;
}

export class BidirectionalSync {
  private syncState: SyncState | null = null;

  async sync(
    markdownContent: string,
    tasks: Task[],
    direction: SyncDirection,
    previousState?: SyncState,
  ): Promise<ExtendedSyncResult> {
    this.syncState = previousState || null;
    return replicateMD(markdownContent, tasks, direction);
  }

  updateSyncState(markdownContent: string, tasks: Task[]): SyncState {
    // Simple checksum implementation
    const fileChecksum = this.simpleChecksum(markdownContent);
    const taskChecksums = new Map<string, string>();

    tasks.forEach((task) => {
      taskChecksums.set(task.id, this.simpleChecksum(JSON.stringify(task)));
    });

    this.syncState = {
      lastSyncTime: Date.now(),
      fileChecksum,
      taskChecksums,
    };

    return this.syncState;
  }

  private simpleChecksum(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}
