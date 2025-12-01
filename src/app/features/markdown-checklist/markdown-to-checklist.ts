import { MarkdownChecklistTask } from './markdown-checklist.model';

export const markdownToChecklist = (text: string): MarkdownChecklistTask[] => {
  const items: MarkdownChecklistTask[] = [];
  text.split('\n').forEach((it: string) => {
    const t = it.trim();
    const isChecked = t.startsWith('- [x] ');
    if (isChecked || t.startsWith('- [ ]')) {
      items.push({
        text: t.replace('- [x] ', '').replace('- [ ]', '').trim(),
        isChecked,
      });
    }
  });
  return items;
};
