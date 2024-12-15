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

import { isMarkdownChecklist } from './is-markdown-checklist';

describe('isMarkdownChecklist()', () => {
  [
    // --
    '- [ ] task',
    '   - [ ] task',
    '- [x] task another yeah',
    '\n- [ ] task\n\n',
  ].forEach((text, i) => {
    it(`should return true for a valid checklist #${i}`, () => {
      expect(isMarkdownChecklist(text)).toBe(true);
    });
  });

  [
    // --
    'some what - [ ] task',
    '- [x] task another yeah\nSomewhat',
    '',
    '\n\n',
    'Some what yeah\n- [ ] task\n\n',
  ].forEach((text, i) => {
    it(`should return false for a non valid checklist #${i}`, () => {
      expect(isMarkdownChecklist(text)).toBe(false);
    });
  });
});
