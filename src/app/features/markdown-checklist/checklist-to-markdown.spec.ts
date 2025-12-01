import { checklistToMarkdown } from './checklist-to-markdown';
import { MarkdownChecklistTask } from './markdown-checklist.model';

describe('checklistToMarkdown()', () => {
  const ITEMS: [MarkdownChecklistTask[], string][] = [
    [[{ text: 'task', isChecked: false }], '- [ ] task'],
    [[{ text: 'task', isChecked: true }], '- [x] task'],
    [
      [
        { text: 'task', isChecked: true },
        { text: 'whatever sdasd asd sadf asdfa sdfasdf asdf', isChecked: false },
      ],
      '- [x] task\n- [ ] whatever sdasd asd sadf asdfa sdfasdf asdf',
    ],
  ];

  ITEMS.forEach((item, i): void => {
    const [checkItems, text] = item;
    it(`should parse expected value #${i}`, () => {
      expect(checklistToMarkdown(checkItems)).toEqual(text);
    });
  });
});
