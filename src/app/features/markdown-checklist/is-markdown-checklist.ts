/*
we want to match:
- [x] task
- [ ] tasks

but not:
Some text yeah
- [ ] task

and not:
- [ ] task
Some text yeah
 */

export const isMarkdownChecklist = (text: string): boolean => {
  try {
    const lines = text.split('\n');
    return lines.every(
      (it) => it.trim() === '' || it.startsWith('- [x] ') || it.startsWith('- [ ] '),
    );
  } catch (e) {
    console.error('Checklist parsing failed');
    console.error(e);
    return false;
  }
};
