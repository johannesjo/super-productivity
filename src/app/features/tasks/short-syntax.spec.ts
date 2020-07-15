import { ShowSubTasksMode, TaskCopy } from './task.model';
import { shortSyntax } from './short-syntax.util';
import { getWorklogStr } from '../../util/get-work-log-str';
import { Tag } from '../tag/tag.model';
import { DEFAULT_TAG } from '../tag/tag.const';

const TASK: TaskCopy = {
  id: 'id',
  projectId: null,
  subTaskIds: [],
  timeSpentOnDay: {},
  timeSpent: 0,
  timeEstimate: 0,
  isDone: false,
  doneOn: null,
  title: '',
  notes: '',
  tagIds: [],
  parentId: null,
  reminderId: null,
  created: Date.now(),
  repeatCfgId: null,

  _showSubTasksMode: ShowSubTasksMode.Show,

  attachments: [],

  issueId: null,
  issuePoints: null,
  issueType: null,
  issueAttachmentNr: null,
  issueLastUpdated: null,
  issueWasUpdated: null,
};
const ALL_TAGS: Tag[] = [
  {...DEFAULT_TAG, id: 'blu_id', title: 'blu'},
  {...DEFAULT_TAG, id: 'bla_id', title: 'bla'},
  {...DEFAULT_TAG, id: 'hihi_id', title: 'hihi'},
  {...DEFAULT_TAG, id: '1_id', title: '1'},
  {...DEFAULT_TAG, id: 'A_id', title: 'A'},
  {...DEFAULT_TAG, id: 'multi_word_id', title: 'Multi Word Tag'},
];

describe('shortSyntax', () => {
  it('should ignore for no short syntax', () => {
    const r = shortSyntax(TASK);
    expect(r).toEqual(undefined);
  });

  it('should ignore if the changes cause no further changes', () => {
    const r = shortSyntax({
      ...TASK,
      title: 'So what shall I do'
    });
    expect(r).toEqual(undefined);
  });

  describe('should work for time short syntax', () => {
    it('', () => {
      const t = {
        ...TASK,
        title: 'Fun title 10m/1h'
      };
      const r = shortSyntax(t);
      expect(r).toEqual({
        newTagTitles: [],
        taskChanges: {
          title: 'Fun title',
          // timeSpent: 7200000,
          timeSpentOnDay: {
            [getWorklogStr()]: 600000
          },
          timeEstimate: 3600000
        }
      });
    });

    it('', () => {
      const t = {
        ...TASK,
        title: 'Fun title whatever 1h/120m'
      };
      const r = shortSyntax(t);
      expect(r).toEqual({
        newTagTitles: [],
        taskChanges: {
          title: 'Fun title whatever',
          // timeSpent: 7200000,
          timeSpentOnDay: {
            [getWorklogStr()]: 3600000
          },
          timeEstimate: 7200000
        }
      });
    });
  });

  describe('tags', () => {
    it('should work with tags', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #A'
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: [],
        taskChanges: {
          title: 'Fun title',
          tagIds: ['blu_id', 'A_id']
        }
      });
    });

    it('should not overwrite existing tags', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #hihi',
        tagIds: ['blu_id', 'A', 'multi_word_id']
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: [],
        taskChanges: {
          title: 'Fun title',
          tagIds: ['blu_id', 'A', 'multi_word_id', 'hihi_id']
        }
      });
    });

    it('should add new tag names', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #idontexist',
        tagIds: []
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: ['idontexist'],
        taskChanges: {
          title: 'Fun title',
          tagIds: ['blu_id']
        }
      });
    });
  });

  describe('should work with all combined', () => {
    it('', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu 10m/1h'
      };
      const r = shortSyntax(t, ALL_TAGS);
      expect(r).toEqual({
        newTagTitles: [],
        taskChanges: {
          title: 'Fun title',
          // timeSpent: 7200000,
          timeSpentOnDay: {
            [getWorklogStr()]: 600000
          },
          timeEstimate: 3600000,
          tagIds: ['blu_id']
        }
      });
    });

    // TODO make this work maybe
    // it('', () => {
    //   const t = {
    //     ...TASK,
    //     title: 'Fun title 10m/1h #blu'
    //   };
    //   const r = shortSyntax(t, ALL_TAGS);
    //   expect(r).toEqual({
    //     title: 'Fun title',
    //     // timeSpent: 7200000,
    //     timeSpentOnDay: {
    //       [getWorklogStr()]: 600000
    //     },
    //     timeEstimate: 3600000,
    //     tagIds: ['blu_id']
    //   });
    // });
  });
});
