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
  { ...DEFAULT_TAG, id: 'blu_id', title: 'blu' },
  { ...DEFAULT_TAG, id: 'bla_id', title: 'bla' },
  { ...DEFAULT_TAG, id: 'hihi_id', title: 'hihi' },
  { ...DEFAULT_TAG, id: '1_id', title: '1' },
  { ...DEFAULT_TAG, id: 'A_id', title: 'A' },
  { ...DEFAULT_TAG, id: 'multi_word_id', title: 'Multi Word Tag' },
];

const getPlannedDateInMilliseconds = (taskInput: TaskCopy): number => {
  const r = shortSyntax(taskInput);
  const parsedDateInMilliseconds = r?.taskChanges?.plannedAt as number;
  return parsedDateInMilliseconds;
};

const checkSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const checkIfADateIsTomorrow = (date1: Date, date2: Date): boolean => {
  const nextday = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate() + 1);
  return (
    nextday.getFullYear() === date2.getFullYear() &&
    nextday.getMonth() === date2.getMonth() &&
    nextday.getDate() === date2.getDate()
  );
};

const checkIfDateHasCorrectTime = (date: Date, hour: number, minute: number): boolean => {
  return date.getHours() === hour && date.getMinutes() === minute;
};

describe('shortSyntax', () => {
  it('should ignore for no short syntax', () => {
    const r = shortSyntax(TASK);
    expect(r).toEqual(undefined);
  });

  it('should ignore if the changes cause no further changes', () => {
    const r = shortSyntax({
      ...TASK,
      title: 'So what shall I do',
    });
    expect(r).toEqual(undefined);
  });

  describe('should work for time short syntax', () => {
    it('', () => {
      const t = {
        ...TASK,
        title: 'Fun title 10m/1h',
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
            [getWorklogStr()]: 600000,
          },
          timeEstimate: 3600000,
        },
      });
    });

    it('', () => {
      const t = {
        ...TASK,
        title: 'Fun title whatever 1h/120m',
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
            [getWorklogStr()]: 3600000,
          },
          timeEstimate: 7200000,
        },
      });
    });
  });

  describe('should recognize short syntax for date', () => {
    it('should correctly parse schedule syntax with time only', () => {
      const t = {
        ...TASK,
        title: 'Test @4pm',
      };
      const parsedDateInMilliseconds = getPlannedDateInMilliseconds(t);
      const parsedDate = new Date(parsedDateInMilliseconds);
      const now = new Date();
      if (now.getHours() > 16 || (now.getHours() === 16 && now.getMinutes() > 0)) {
        const isSetToTomorrow = checkIfADateIsTomorrow(now, parsedDate);
        expect(isSetToTomorrow).toBeTrue();
      } else {
        const isSetToSameDay = checkSameDay(parsedDate, now);
        expect(isSetToSameDay).toBeTrue();
      }
      const isTimeSetCorrectly = checkIfDateHasCorrectTime(parsedDate, 16, 0);
      expect(isTimeSetCorrectly).toBeTrue();
    });
    it('should parse syntax "@tod" as today 23:59:59', () => {
      const t = {
        ...TASK,
        title: 'Test @tod',
      };
      const date = new Date();
      date.setHours(23, 59, 59);
      const parsedDateInMilliseconds = getPlannedDateInMilliseconds(t);
      const marginError = Math.abs(date.getTime() - parsedDateInMilliseconds);
      // There may be slight discrepancy between the plannedAt number
      // and the milliseconds representing today 23:59:59 here, so
      // we accept the discrepancy to be equal or less than 1000
      // milliseconds, or 1 second
      expect(marginError).toBeLessThanOrEqual(1000);
    });
    it('should parse syntax "tom" as tomorrow 23:59:59', () => {
      const t = {
        ...TASK,
        title: 'Test @tom',
      };
      const parsedDateInMilliseconds = getPlannedDateInMilliseconds(t);
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(23, 59, 59);
      const marginError = Math.abs(date.getTime() - parsedDateInMilliseconds);
      expect(marginError).toBeLessThanOrEqual(1000);
    });
    it('should correctly parse syntax "tod 4pm', () => {
      const t = {
        ...TASK,
        title: 'Test @tod 4pm',
      };
      const parsedDateInMilliseconds = getPlannedDateInMilliseconds(t);
      const parsedDate = new Date(parsedDateInMilliseconds);
      const isTimeSetCorrectly = checkIfDateHasCorrectTime(parsedDate, 16, 0);
      expect(isTimeSetCorrectly).toBeTrue();
      const now = new Date();
      let implicitDate = now;
      // If the current time is past the given time, it means the task is set for
      // tomorrow and we need to set impliicit date to tomorrow
      if (now.getHours() > 16 || (now.getHours() === 16 && now.getMinutes() > 0)) {
        implicitDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      }
      const matchedDate =
        implicitDate.getFullYear() === parsedDate.getFullYear() &&
        implicitDate.getMonth() === parsedDate.getMonth() &&
        implicitDate.getDate() === parsedDate.getDate();
      expect(matchedDate).toBeTrue();
    });
    it('should correctly parse syntax for tomorrow with time', () => {
      const t = {
        ...TASK,
        title: 'Test @tom 4pm',
      };
      const parsedDateInMilliseconds = getPlannedDateInMilliseconds(t);
      const parsedDate = new Date(parsedDateInMilliseconds);
      const now = new Date();
      const isSetToTomorrow = checkIfADateIsTomorrow(now, parsedDate);
      const isTimeSetCorrectly = checkIfDateHasCorrectTime(parsedDate, 16, 0);
      expect(isSetToTomorrow).toBeTrue();
      expect(isTimeSetCorrectly).toBeTrue();
    });
    it('should correctly parse day of the week', () => {
      const t = {
        ...TASK,
        title: 'Test @Friday',
      };
      const parsedDateInMilliseconds = getPlannedDateInMilliseconds(t);
      const parsedDate = new Date(parsedDateInMilliseconds);
      // 5 represents Friday
      expect(parsedDate.getDay()).toEqual(5);
      const now = new Date();
      const todayInNumber = now.getDay();
      let dayIncrement = 0;
      // If today happens to be Friday, the parsed date will be the next Friday,
      // 7 days from today
      if (todayInNumber === 5) {
        dayIncrement = 7;
      } else {
        if (todayInNumber < 5) {
          dayIncrement = 5 - todayInNumber;
        } else {
          dayIncrement = 7 - todayInNumber + 5;
        }
      }
      const nextFriday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + dayIncrement,
      );
      const isDateSetCorrectly = checkSameDay(parsedDate, nextFriday);
      expect(isDateSetCorrectly).toBeTrue();
    });
  });

    it('should not trigger for tasks with starting # (e.g. github issues) when adding tags', () => {
      const t = {
        ...TASK,
        title: '#134 Fun title #blu',
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: '#134 Fun title',
          tagIds: ['blu_id'],
        },
      });
    });

    it('should work with tags', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #A',
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Fun title',
          tagIds: ['blu_id', 'A_id'],
        },
      });
    });

    it('should not overwrite existing tags', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #hihi',
        tagIds: ['blu_id', 'A', 'multi_word_id'],
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Fun title',
          tagIds: ['blu_id', 'A', 'multi_word_id', 'hihi_id'],
        },
      });
    });

    it('should add new tag names', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #idontexist',
        tagIds: [],
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: ['idontexist'],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Fun title',
          tagIds: ['blu_id'],
        },
      });
    });

    it('should add new "asd #asd" tag', () => {
      const t = {
        ...TASK,
        title: 'asd #asd',
        tagIds: [],
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: ['asd'],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'asd',
        },
      });
    });

    it('should not add tags for sub tasks', () => {
      const t = {
        ...TASK,
        parentId: 'SOMEPARENT',
        title: 'Fun title #blu #idontexist',
        tagIds: [],
      };
      const r = shortSyntax(t, ALL_TAGS);

      expect(r).toEqual(undefined);
    });
  });

  describe('should work with all combined', () => {
    it('', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu 10m/1h',
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
            [getWorklogStr()]: 600000,
          },
          timeEstimate: 3600000,
          tagIds: ['blu_id'],
        },
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
          id: 'ProjectEasyShortID',
        },
        {
          title: 'Some Project Title',
          id: 'SomeProjectID',
        },
      ] as any;
    });

    it('should work', () => {
      const t = {
        ...TASK,
        title: 'Fun title +ProjectEasyShort',
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
        title: 'Fun title +ProjectEasyShort 10m/1h',
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
        title: 'Fun title +Project',
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
        title: 'Fun title +Some Project Title',
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
        title: 'Fun title +Some Pro',
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
        title: 'Other fun title +SomePro',
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
        title: 'Other fun title +Non existing project',
      };
      const r = shortSyntax(t, [], projects);
      expect(r).toEqual(undefined);
    });
  });

  describe('due:', () => {});

  describe('combined', () => {
    it('should work when time comes first', () => {
      const projects = [
        {
          title: 'ProjectEasyShort',
          id: 'ProjectEasyShortID',
        },
      ] as any;
      const t = {
        ...TASK,
        title: 'Fun title 10m/1h +ProjectEasyShort',
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

    it('should work for project first', () => {
      const projects = [
        {
          title: 'ProjectEasyShort',
          id: 'ProjectEasyShortID',
        },
      ] as any;
      const t = {
        ...TASK,
        title: 'Some task +ProjectEasyShort 30m #tag',
      };
      const r = shortSyntax(t, [], projects);
      expect(r).toEqual({
        newTagTitles: ['tag'],
        remindAt: null,
        projectId: 'ProjectEasyShortID',
        taskChanges: {
          title: 'Some task',
          // timeSpent: 7200000,
          timeEstimate: 1800000,
        },
      });
    });
  });
});
