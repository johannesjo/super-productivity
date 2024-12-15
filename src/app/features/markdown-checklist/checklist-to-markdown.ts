import { MarkdownChecklistTask } from './markdown-checklist.model';

export const checklistToMarkdown = (tasks: MarkdownChecklistTask[]): string => {
  return tasks.map((task) => `- [${task.isChecked ? 'x' : ' '}] ${task.text}`).join('\n');
};
