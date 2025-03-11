import { ShowSubTasksMode, TaskCopy } from './task.model';
import { shortSyntax } from './short-syntax';
import { getWorklogStr } from '../../util/get-work-log-str';
import { Tag } from '../tag/tag.model';
import { DEFAULT_TAG } from '../tag/tag.const';
import { Project } from '../project/project.model';
import { DEFAULT_GLOBAL_CONFIG } from '../config/default-global-config.const';

const TASK: TaskCopy = {
  id: 'id',
  projectId: undefined,
  subTaskIds: [],
  timeSpentOnDay: {},
  timeSpent: 0,
  timeEstimate: 0,
  isDone: false,
  doneOn: undefined,
  title: '',
  notes: '',
  tagIds: [],
  parentId: undefined,
  reminderId: undefined,
  created: Date.now(),
  repeatCfgId: undefined,
  plannedAt: undefined,

  _showSubTasksMode: ShowSubTasksMode.Show,

  attachments: [],

  issueId: undefined,
  issueProviderId: undefined,
  issuePoints: undefined,
  issueType: undefined,
  issueAttachmentNr: undefined,
  issueLastUpdated: undefined,
  issueWasUpdated: undefined,
  issueTimeTracked: undefined,
};
const ALL_TAGS: Tag[] = [
  { ...DEFAULT_TAG, id: 'blu_id', title: 'blu' },
  { ...DEFAULT_TAG, id: 'bla_id', title: 'bla' },
  { ...DEFAULT_TAG, id: 'hihi_id', title: 'hihi' },
  { ...DEFAULT_TAG, id: '1_id', title: '1' },
  { ...DEFAULT_TAG, id: 'A_id', title: 'A' },
  { ...DEFAULT_TAG, id: 'multi_word_id', title: 'Multi Word Tag' },
];
const CONFIG = DEFAULT_GLOBAL_CONFIG.shortSyntax;

const getPlannedDateTimestampFromShortSyntaxReturnValue = (
  taskInput: TaskCopy,
  now: Date = new Date(),
): number => {
  const r = shortSyntax(taskInput, CONFIG, undefined, undefined, now);
  const parsedDateInMilliseconds = r?.taskChanges?.plannedAt as number;
  return parsedDateInMilliseconds;
};

const checkSameDay = (date1: Date, date2: Date): boolean => {
  expect(date1.getFullYear()).toBe(date2.getFullYear());
  expect(date1.getMonth()).toBe(date2.getMonth());
  expect(date1.getDate()).toBe(date2.getDate());

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const checkIfADateIsTomorrow = (now: Date, tmrDate: Date): boolean => {
  const nextday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return checkSameDay(nextday, tmrDate);
};

const checkIfDateHasCorrectTime = (date: Date, hour: number, minute: number): boolean => {
  expect(date.getHours()).toBe(hour);
  expect(date.getMinutes()).toBe(minute);
  return date.getHours() === hour && date.getMinutes() === minute;
};

const formatDateToISO = (dateObj: Date): string => {
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const monthString = month < 10 ? `0${month}` : `${month}`;
  const date = dateObj.getDate();
  const dateString = date < 10 ? `0${date}` : `${date}`;
  return `${year}-${monthString}-${dateString}`;
};

const dayToNumberMap = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const checkIfCorrectDateAndTime = (
  timestamp: number,
  day: string,
  hour: number,
  minute: number,
): boolean => {
  const date = new Date(timestamp);
  const isDayCorrect = date.getDay() === dayToNumberMap[day.toLowerCase()];
  const isHourCorrect = date.getHours() === hour;
  const isMinuteCorrect = date.getMinutes() === minute;
  return isDayCorrect && isHourCorrect && isMinuteCorrect;
};

describe('shortSyntax', () => {
  it('should ignore for no short syntax', () => {
    const r = shortSyntax(TASK, CONFIG);
    expect(r).toEqual(undefined);
  });

  it('should ignore if the changes cause no further changes', () => {
    const r = shortSyntax(
      {
        ...TASK,
        title: 'So what shall I do',
      },
      CONFIG,
    );
    expect(r).toEqual(undefined);
  });

  describe('should work for time short syntax', () => {
    it('', () => {
      const t = {
        ...TASK,
        title: 'Fun title 10m/1h',
      };
      const r = shortSyntax(t, CONFIG);
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
      const r = shortSyntax(t, CONFIG);
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

    it('should ignore time short syntax when disabled', () => {
      const t = {
        ...TASK,
        title: 'Fun title whatever 1h/120m',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableDue: false });
      expect(r).toEqual(undefined);
    });
  });

  describe('should recognize short syntax for date', () => {
    it('should correctly parse schedule syntax with time only', () => {
      const t = {
        ...TASK,
        title: 'Test @4pm',
      };
      const parsedDateInMilliseconds =
        getPlannedDateTimestampFromShortSyntaxReturnValue(t);
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

    it('should ignore schedule syntax with time only when disabled', () => {
      const t = {
        ...TASK,
        title: 'Test @4pm',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableDue: false });
      expect(r).toEqual(undefined);
    });

    it('should ignore day of the week when disabled', () => {
      const t = {
        ...TASK,
        title: 'Test @Friday',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableDue: false });
      expect(r).toEqual(undefined);
    });

    it('should correctly parse day of the week', () => {
      const t = {
        ...TASK,
        title: 'Test @Friday',
      };
      const now = new Date('Fri Feb 09 2024 11:31:29 ');
      const parsedDateInMilliseconds = getPlannedDateTimestampFromShortSyntaxReturnValue(
        t,
        now,
      );
      const parsedDate = new Date(parsedDateInMilliseconds);
      expect(parsedDate.getDay()).toEqual(5);
      const dayIncrement = 0;
      // If today happens to be Friday, the parsed date will be the next Friday,
      // 7 days from today only when after 12
      const nextFriday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + dayIncrement,
      );
      const isDateSetCorrectly = checkSameDay(parsedDate, nextFriday);
      expect(isDateSetCorrectly).toBeTrue();
    });
  });

  describe('tags', () => {
    it('should not trigger for tasks with starting # (e.g. github issues)', () => {
      const t = {
        ...TASK,
        title: '#134 Fun title',
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);

      expect(r).toEqual(undefined);
    });

    it('should not trigger for tasks with starting # (e.g. github issues) when disabled', () => {
      const t = {
        ...TASK,
        title: '#134 Fun title',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableTag: false }, ALL_TAGS);

      expect(r).toEqual(undefined);
    });

    it('should not trigger for tasks with starting # (e.g. github issues) when adding tags', () => {
      const t = {
        ...TASK,
        title: '#134 Fun title #blu',
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);

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

    it('should not trigger for multiple tasks when disabled', () => {
      const t = {
        ...TASK,
        title: '#134 Fun title #blu',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableTag: false }, ALL_TAGS);

      expect(r).toEqual(undefined);
    });

    it('should work with tags', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #A',
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);

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

    it("shouldn't work with tags when disabled", () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #A',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableTag: false }, ALL_TAGS);

      expect(r).toEqual(undefined);
    });

    it('should not trigger for # without space before', () => {
      const t = {
        ...TASK,
        title: 'Fun title#blu',
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);

      expect(r).toEqual(undefined);
    });

    it('should not trigger for # without space before but parse other tags', () => {
      const t = {
        ...TASK,
        title: 'Fun title#blu #bla',
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Fun title#blu',
          tagIds: ['bla_id'],
        },
      });
    });

    it('should not overwrite existing tags', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #hihi',
        tagIds: ['blu_id', 'A', 'multi_word_id'],
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);

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

    it('should not overwrite existing tags when disabled', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #hihi',
        tagIds: ['blu_id', 'A', 'multi_word_id'],
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableTag: false }, ALL_TAGS);

      expect(r).toEqual(undefined);
    });

    it('should add new tag names', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #idontexist',
        tagIds: [],
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);

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

    it('should not add new tag names when disabled', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu #idontexist',
        tagIds: [],
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableTag: false }, ALL_TAGS);

      expect(r).toEqual(undefined);
    });

    it('should add new "asd #asd" tag', () => {
      const t = {
        ...TASK,
        title: 'asd #asd',
        tagIds: [],
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: ['asd'],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'asd',
        },
      });
    });

    it('should work for edge case #3728', () => {
      const t = {
        ...TASK,
        title: 'Test tag error #testing #someNewTag3',
        tagIds: [],
      };
      const r = shortSyntax(t, CONFIG, [
        ...ALL_TAGS,
        { ...DEFAULT_TAG, id: 'testing_id', title: 'testing' },
      ]);

      expect(r).toEqual({
        newTagTitles: ['someNewTag3'],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Test tag error',
          tagIds: ['testing_id'],
        },
      });
    });

    it('should not add new "asd #asd" tag when disabled', () => {
      const t = {
        ...TASK,
        title: 'asd #asd',
        tagIds: [],
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableTag: false }, ALL_TAGS);

      expect(r).toEqual(undefined);
    });

    it('should add tags for sub tasks', () => {
      const t = {
        ...TASK,
        parentId: 'SOMEPARENT',
        title: 'Fun title #blu #idontexist',
        tagIds: [],
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);

      expect(r).toEqual({
        newTagTitles: ['idontexist'],
        projectId: undefined,
        remindAt: null,
        taskChanges: { tagIds: ['blu_id'], title: 'Fun title' },
      });
    });

    it('should not add tags for sub tasks when disabled', () => {
      const t = {
        ...TASK,
        parentId: 'SOMEPARENT',
        title: 'Fun title #blu #idontexist',
        tagIds: [],
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableTag: false }, ALL_TAGS);

      expect(r).toEqual(undefined);
    });
  });
  describe('should work with tags and time estimates combined', () => {
    it('tag before time estimate', () => {
      const t = {
        ...TASK,
        title: 'Fun title #blu 10m/1h',
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);
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

    it('time estimate before tag', () => {
      const t = {
        ...TASK,
        title: 'Fun title 10m/1h #blu',
      };
      const r = shortSyntax(t, CONFIG, ALL_TAGS);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Fun title',
          timeSpentOnDay: {
            [getWorklogStr()]: 600000,
          },
          timeEstimate: 3600000,
          tagIds: ['blu_id'],
        },
      });
    });

    it('time estimate disabled', () => {
      const t = {
        ...TASK,
        title: 'Fun title 10m/1h #blu',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableDue: false }, ALL_TAGS);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Fun title 10m/1h',
          tagIds: ['blu_id'],
        },
      });
    });

    it('tags disabled', () => {
      const t = {
        ...TASK,
        title: 'Fun title 10m/1h #blu',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableTag: false }, ALL_TAGS);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Fun title #blu',
          timeSpentOnDay: {
            [getWorklogStr()]: 600000,
          },
          timeEstimate: 3600000,
        },
      });
    });
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
      const r = shortSyntax(t, CONFIG, [], projects);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: 'ProjectEasyShortID',
        taskChanges: {
          title: 'Fun title',
        },
      });
    });

    it("shouldn't work when disabled", () => {
      const t = {
        ...TASK,
        title: 'Fun title +ProjectEasyShort',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableProject: false }, [], projects);
      expect(r).toEqual(undefined);
    });

    it('should not parse without missing whitespace before', () => {
      const t = {
        ...TASK,
        title: 'Fun title+ProjectEasyShort',
      };
      const r = shortSyntax(t, CONFIG, [], projects);
      expect(r).toEqual(undefined);
    });

    it('should work together with time estimates', () => {
      const t = {
        ...TASK,
        title: 'Fun title +ProjectEasyShort 10m/1h',
      };
      const r = shortSyntax(t, CONFIG, [], projects);
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

    it('should work together with time estimates when disabled', () => {
      const t = {
        ...TASK,
        title: 'Fun title +ProjectEasyShort 10m/1h',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableProject: false }, [], projects);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: undefined,
        taskChanges: {
          title: 'Fun title +ProjectEasyShort',
          // timeSpent: 7200000,
          timeSpentOnDay: {
            [getWorklogStr()]: 600000,
          },
          timeEstimate: 3600000,
        },
      });
    });

    it('should work together with disabled time estimates', () => {
      const t = {
        ...TASK,
        title: 'Fun title +ProjectEasyShort 10m/1h',
      };
      const r = shortSyntax(t, { ...CONFIG, isEnableDue: false }, [], projects);
      expect(r).toEqual({
        newTagTitles: [],
        remindAt: null,
        projectId: 'ProjectEasyShortID',
        taskChanges: {
          title: 'Fun title 10m/1h',
        },
      });
    });

    it('should work with only the beginning of a project title if it is at least 3 chars long', () => {
      const t = {
        ...TASK,
        title: 'Fun title +Project',
      };
      const r = shortSyntax(t, CONFIG, [], projects);
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
      const r = shortSyntax(t, CONFIG, [], projects);
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
      const r = shortSyntax(t, CONFIG, [], projects);
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
      const r = shortSyntax(t, CONFIG, [], projects);
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
      const r = shortSyntax(t, CONFIG, [], projects);
      expect(r).toEqual(undefined);
    });
  });

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
      const r = shortSyntax(t, CONFIG, [], projects);
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
      const r = shortSyntax(t, CONFIG, [], projects);
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
    it('should correctly parse scheduled date, project, time spent and estimate', () => {
      const projects = [
        {
          title: 'Project',
          id: 'a1b2',
        },
        {
          title: 'Another Project',
          id: 'c3d4',
        },
      ] as any;
      const taskInput = `Test @Friday 4pm +${projects[0].title} 2h/4h`;
      const t = {
        ...TASK,
        title: taskInput,
      };
      const parsedDateInMilliseconds =
        getPlannedDateTimestampFromShortSyntaxReturnValue(t);
      const parsedDate = new Date(parsedDateInMilliseconds);
      // The parsed day and time should be Friday, or 5, and time is 16 hours and 0 minute
      expect(parsedDate.getDay()).toEqual(5);
      const isTimeSetCorrectly = checkIfDateHasCorrectTime(parsedDate, 16, 0);
      expect(isTimeSetCorrectly).toBeTrue();
      const parsedTaskInfo = shortSyntax(t, CONFIG, [], projects);
      expect(parsedTaskInfo?.projectId).toEqual(projects[0].id);
      // The time spent value is stored to the property equal to today
      // in format YYYY-MM-DD of the object `timeSpentOnDay`
      const today = new Date();
      const formatedToday = formatDateToISO(today);
      // Time estimate and time spent should be correctly parsed in milliseconds
      expect(parsedTaskInfo?.taskChanges.timeEstimate).toEqual(3600 * 4 * 1000);
      expect(parsedTaskInfo?.taskChanges?.timeSpentOnDay?.[formatedToday]).toEqual(
        3600 * 2 * 1000,
      );
    });
    it('should correctly parse scheduled date and multiple tags', () => {
      const t = {
        ...TASK,
        title: 'Test @fri 4pm #html #css',
      };
      const plannedTimestamp = getPlannedDateTimestampFromShortSyntaxReturnValue(t);
      const isPlannedDateAndTimeCorrect = checkIfCorrectDateAndTime(
        plannedTimestamp,
        'friday',
        16,
        0,
      );
      expect(isPlannedDateAndTimeCorrect).toBeTrue();
      const parsedTaskInfo = shortSyntax(t, CONFIG, []);
      expect(parsedTaskInfo?.newTagTitles.includes('html')).toBeTrue();
      expect(parsedTaskInfo?.newTagTitles.includes('css')).toBeTrue();
    });

    it('should parse scheduled date using local time zone when unspecified', () => {
      const t = {
        ...TASK,
        title: '@2030-10-12T13:37',
      };
      const plannedTimestamp = getPlannedDateTimestampFromShortSyntaxReturnValue(t);
      expect(checkIfCorrectDateAndTime(plannedTimestamp, 'saturday', 13, 37)).toBeTrue();
    });

    it('should work when all are disabled', () => {
      const t = {
        ...TASK,
        title: 'Test @fri 4pm #html #css +ProjectEasyShort',
      };
      const r = shortSyntax(t, {
        isEnableDue: false,
        isEnableProject: false,
        isEnableTag: false,
      });
      expect(r).toEqual(undefined);
    });
  });
});
