import { ShowSubTasksMode, TaskCopy } from './task.model';
import { shortSyntax } from './short-syntax.util';
import { getWorklogStr } from '../../util/get-work-log-str';
import { Tag } from '../tag/tag.model';
import { DEFAULT_TAG } from '../tag/tag.const';
import { Project } from '../project/project.model';

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
  plannedAt: null,

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
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Fun title',
          // timeSpent: 7200000,
          timeSpentOnDay: {
            [getWorklogStr()]: 600000
          },
          timeEstimate: 3600000
        },
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
        remindAt: null,
        projectId: undefined,
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
    it('should not trigger for tasks with starting # (e.g. github issues)', () => {
      const t = {
        ...TASK,
        title: '#134 Fun title'
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual(undefined);
    });

    it('should not trigger for tasks with starting # (e.g. github issues) when adding tags', () => {
      const t = {
        ...TASK,
        title: '#134 Fun title #blu'
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: '#134 Fun title',
          tagIds: ['blu_id']
        }
      });
    });

    it('should work with tags', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #A'
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: undefined,
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
        remindAt: null,
        projectId: undefined,
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
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Fun title',
          tagIds: ['blu_id']
        }
      });
    });

    it('should add new "asd #asd" tag', () => {
      const t = {
        ...TASK,
        title: 'asd #asd',
        tagIds: []
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: ['asd'],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'asd',
        }
      });
    });

    it('should not add tags for sub tasks', () => {
      const t = {
        ...TASK,
        parentId: 'SOMEPARENT',
        title: 'Fun title #blu #idontexist',
        tagIds: []
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual(undefined);
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
        remindAt: null,
        projectId: undefined,
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

  describe('projects', () => {
    let projects: Project[];
    beforeEach(() => {
      projects = [
        {
          title: 'ProjectEasyShort',
          id: 'ProjectEasyShortID'
        },
        {
          title: 'Some Project Title',
          id: 'SomeProjectID'
        }
      ] as any;
    });

    it('should work', () => {
      const t = {
        ...TASK,
        title: 'Fun title +ProjectEasyShort'
      };
      const r = shortSyntax(t, [], projects);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: 'ProjectEasyShortID',
        taskChanges: {
          title: 'Fun title',
        },
      });
    });

    it('should work together with time estimates', () => {
      const t = {
        ...TASK,
        title: 'Fun title +ProjectEasyShort 10m/1h'
      };
      const r = shortSyntax(t, [], projects);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: 'ProjectEasyShortID',
        taskChanges: {
          title: 'Fun title',
          // timeSpent: 7200000,
          timeSpentOnDay: {
            [getWorklogStr()]: 600000,
          },
          timeEstimate: 3600000,
        },
      });
    });

    it('should work with only the beginning of a project title if it is at least 3 chars long', () => {
      const t = {
        ...TASK,
        title: 'Fun title +Project'
      };
      const r = shortSyntax(t, [], projects);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: 'ProjectEasyShortID',
        taskChanges: {
          title: 'Fun title',
        },
      });
    });

    it('should work with multi word project titles', () => {
      const t = {
        ...TASK,
        title: 'Fun title +Some Project Title'
      };
      const r = shortSyntax(t, [], projects);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: 'SomeProjectID',
        taskChanges: {
          title: 'Fun title',
        },
      });
    });

    it('should work with multi word project titles partial', () => {
      const t = {
        ...TASK,
        title: 'Fun title +Some Pro'
      };
      const r = shortSyntax(t, [], projects);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: 'SomeProjectID',
        taskChanges: {
          title: 'Fun title',
        },
      });
    });

    it('should work with multi word project titles partial written without white space', () => {
      const t = {
        ...TASK,
        title: 'Other fun title +SomePro'
      };
      const r = shortSyntax(t, [], projects);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: 'SomeProjectID',
        taskChanges: {
          title: 'Other fun title',
        },
      });
    });

    it('should ignore non existing', () => {
      const t = {
        ...TASK,
        title: 'Other fun title +Some non existing project'
      };
      const r = shortSyntax(t, [], projects);
      expect(r).toEqual(undefined);
    });
  });

  describe('due:', () => {
  });

  describe('combined', () => {
    it('should work when time comes first', () => {
      const projects = [
        {
          title: 'ProjectEasyShort',
          id: 'ProjectEasyShortID'
        },
      ] as any;
      const t = {
        ...TASK,
        title: 'Fun title 10m/1h +ProjectEasyShort'
      };
      const r = shortSyntax(t, [], projects);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: 'ProjectEasyShortID',
        taskChanges: {
          title: 'Fun title',
          // timeSpent: 7200000,
          timeSpentOnDay: {
            [getWorklogStr()]: 600000
          },
          timeEstimate: 3600000
        },
      });
    });
  });
});
