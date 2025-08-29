/**
 * Renders a prompt template with optional tasks markdown
 */
export function renderPrompt(template: string, tasksMd?: string): string {
  if (!tasksMd) {
    return template;
  }

  // Append tasks section at the end
  return `${template}

Current tasks:
${tasksMd}`;
}
