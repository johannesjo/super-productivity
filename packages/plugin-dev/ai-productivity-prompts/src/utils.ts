/**
 * Renders a prompt template with optional tasks markdown
 */
export const renderPrompt = (template: string, tasksMd?: string): string => {
  if (!tasksMd) {
    return template;
  }

  return `${template}

Current tasks:
${tasksMd}`;
};

/**
 * Formats tasks as markdown checklist
 */
export const formatTasksAsMarkdown = (tasks: any[]): string => {
  return tasks.map((task) => `- [ ] ${task.title}`).join('\n');
};

/**
 * Gets today's date string in YYYY-MM-DD format
 */
export const getTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * Checks if a task was created or worked on today
 */
export const isTaskForToday = (task: any, todayStr: string): boolean => {
  if (task.isDone) return false;

  return (
    task.timeSpentOnDay?.[todayStr] > 0 ||
    new Date(task.created).toDateString() === new Date().toDateString()
  );
};

/**
 * Truncates text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 80): string => {
  if (!text) return 'No preview available';
  const firstLine = text.split('\n')[0]?.trim() || '';
  return firstLine.length > maxLength
    ? firstLine.substring(0, maxLength) + '...'
    : firstLine;
};

/**
 * Copies text to clipboard with fallback
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Creates a ChatGPT URL with encoded prompt
 */
export const createChatGPTUrl = (prompt: string): string => {
  const cleanPrompt = prompt.replace(/\./g, ' ').replace(/-/g, ' ');
  const encodedPrompt = encodeURI(cleanPrompt);
  return `https://chat.openai.com/?q=${encodedPrompt}`;
};

/**
 * Validates selection and returns whether project exists
 */
export const isValidProjectSelection = (
  selection: string,
  projects: Array<{ id: string }>,
): boolean => {
  if (!selection.startsWith('project-')) return true;

  const projectId = selection.replace('project-', '');
  return projects.some((p) => p.id === projectId);
};
