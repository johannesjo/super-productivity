import { markdownToChecklist } from './markdown-to-checklist';
import { MarkdownChecklistTask } from './markdown-checklist.model';

describe('markdownToChecklist()', () => {
  const ITEMS: [string, MarkdownChecklistTask[]][] = [
    // --
    ['- [ ] task', [{ text: 'task', isChecked: false }]],
    ['- [x] task', [{ text: 'task', isChecked: true }]],
    [
      '\n- [x] task \n - [ ] whatever sdasd asd sadf asdfa sdfasdf asdf',
      [
        { text: 'task', isChecked: true },
        { text: 'whatever sdasd asd sadf asdfa sdfasdf asdf', isChecked: false },
      ],
    ],
  ];

  ITEMS.forEach((item, i): void => {
    const [text, checkItems] = item;
    it(`should parse expected value #${i}`, () => {
      expect(markdownToChecklist(text)).toEqual(checkItems);
    });
  });
});
