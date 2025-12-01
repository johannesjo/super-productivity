import { Log } from '../../core/log';

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
    const lines = text.split('\n').filter((it) => it.trim() !== '');

    if (lines.length === 0) {
      return false;
    }

    const items = lines.filter(
      (it) => it.trim().startsWith('- [x]') || it.trim().startsWith('- [ ]'),
    );
    return items.length === lines.length || items.length >= 2;
  } catch (e) {
    Log.err('Checklist parsing failed');
    Log.err(e);
    return false;
  }
};
