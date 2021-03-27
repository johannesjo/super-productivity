/* eslint-disable one-var */
import { WorkStartEnd } from 'src/app/features/work-context/work-context.model';
import { WorklogGrouping } from '../worklog.model';
import { createRows } from './worklog-export.util';
import { DEFAULT_TASK, WorklogTask } from '../../tasks/task.model';
import { DEFAULT_PROJECT } from '../../project/project.const';
import { DEFAULT_TAG } from '../../tag/tag.const';
import { Project } from 'src/app/features/project/project.model';

const startTime1 = new Date('5/2/2021 10:00:00').getTime();
const endTime1 = new Date('5/2/2021 12:00:00').getTime();
const startTime2 = new Date('6/2/2021 14:00:00').getTime();
const endTime2 = new Date('6/2/2021 16:00:00').getTime();
const dateKey1 = '2021-02-05', dateKey2 = '2021-02-06';
const startTimes: WorkStartEnd = { [dateKey1]: startTime1, [dateKey2]: startTime2 };
const endTimes: WorkStartEnd  = { [dateKey1]: endTime1, [dateKey2]: endTime2 };
const oneHour = 3600000, twoHours = 7200000;

const createTask = (partialTask: Partial<WorklogTask>): WorklogTask => {
  const deepCopy = JSON.parse(JSON.stringify(DEFAULT_TASK));
  return {
    ...deepCopy,
    timeSpentOnDay: { [dateKey1]: oneHour, },
    title: partialTask.id as string,
    ...partialTask,
    dateStr: '',
  };
};

const createSubTask = (partialTask: Partial<WorklogTask>, parentTask: WorklogTask) => {
  parentTask.subTaskIds.push(partialTask.id as string);
  return createTask({ ...partialTask, parentId: parentTask.id });
};

const createTag = (tagId: string, ...tasks: WorklogTask[]) => {
  const taskIds: string[] = [];
  tasks.forEach(task => {
    taskIds.push(task.id);
    task.tagIds.push(tagId);
  });
  return { ...DEFAULT_TAG, id: tagId, taskIds, title: tagId };
};

const createProject = (projectId: string, ...tasks: WorklogTask[]): Project => {
  const taskIds: string[] = [];
  tasks.forEach(task => {
    taskIds.push(task.id);
    Object.defineProperty(task, 'projectId', { value: projectId });
  });
  return { ...DEFAULT_PROJECT, id: projectId, taskIds, title: projectId };
};

describe('createRows', () => {
  describe('time', () => {
    it('should have correct time fields', () => {
      const tasks = [
        createTask({ id: 'T1', timeSpentOnDay: { [dateKey1]: oneHour }, timeEstimate: twoHours }),
        createTask({ id: 'T2', timeSpentOnDay: { [dateKey1]: oneHour }, timeEstimate: twoHours }),
        createTask({ id: 'T3', timeSpentOnDay: { [dateKey1]: oneHour }, timeEstimate: twoHours })
      ];
      const rows = createRows(tasks, {}, {}, WorklogGrouping.DATE, [], []);
      expect(rows.length).toBe(1);
      expect(rows[0].timeSpent).toBe(oneHour*3);
      expect(rows[0].timeEstimate).toBe(twoHours*3);
    });

    it('should have correct WorkStartEnd fields', () => {
      const tasks = [
        createTask({ id: 'T1' }),
        createTask({ id: 'T2' }),
        createTask({ id: 'T3', timeSpentOnDay: { [dateKey2]: oneHour }})
      ];
      const rows = createRows(tasks, startTimes, endTimes, WorklogGrouping.DATE, [], []);
      expect(rows.length).toBe(2);
      expect(rows[0].workStart).toBe(startTimes[dateKey1]);
      expect(rows[0].workEnd).toBe(endTimes[dateKey1]);
      expect(rows[1].workStart).toBe(startTimes[dateKey2]);
      expect(rows[1].workEnd).toBe(endTimes[dateKey2]);
    });
  });

  describe('date', () => {
    it('should sort date fields', () => {
      const tasks = [
        createTask({ id: 'T1', timeSpentOnDay: { [dateKey1]: oneHour, '2021-02-20': oneHour, [dateKey2]: oneHour} }),
      ];
      const rows = createRows(tasks, {}, {}, WorklogGrouping.TASK, [], []);
      expect(rows.length).toBe(1);
      expect(rows[0].dates).toEqual([ dateKey1, dateKey2, '2021-02-20']);
    });
  });

  describe('subtasks', () => {
    const parentTaskId = 'PT1', subTaskId1 = 'S2', subTaskId2 = 'S3', otherTaskId = 'T4';
    const task1 = createTask({ id:parentTaskId });
    const task2 = createSubTask({ id:subTaskId1 }, task1);
    const task3 = createSubTask({ id:subTaskId2 }, task1);
    const task4 = createTask({ id:otherTaskId });
    const tasks = [ task1, task2, task3, task4 ];

    it('should have correct titles when grouping by parent', () => {
      const rows = createRows(tasks, {}, {}, WorklogGrouping.PARENT, [], []);
      expect(rows.length).toBe(2);
      expect(rows[0].titles).toEqual([ parentTaskId ]);
      expect(rows[1].titles).toEqual([ otherTaskId ]);
      expect(rows[0].titlesWithSub).toEqual([ parentTaskId ]);
      expect(rows[1].titlesWithSub).toEqual([ otherTaskId ]);
    });

    it('should have correct titles when grouping by task', () => {
      const rows = createRows(tasks, {}, {}, WorklogGrouping.TASK, [], []);
      expect(rows.length).toBe(3);
      expect(rows[0].titles).toEqual([ parentTaskId ]);
      expect(rows[1].titles).toEqual([ parentTaskId ]);
      expect(rows[2].titles).toEqual([ otherTaskId ]);
      expect(rows[0].titlesWithSub).toEqual([ subTaskId1 ]);
      expect(rows[1].titlesWithSub).toEqual([ subTaskId2 ]);
      expect(rows[2].titlesWithSub).toEqual([ otherTaskId ]);
    });
  });

  describe('projects', () => {
    const task1P1 = '1T', task2P1 = '2T', parentTaskP2 = '3PT', subTask = '4ST';
    const project1 = 'P1', project2 = 'P2';

    const task1 = createTask({ id:task1P1 });
    const task2 = createTask({ id:task2P1 });
    const task3 = createTask({ id:parentTaskP2 });
    const task4 = createSubTask({ id:subTask }, task3);
    const tasks = [ task1, task2, task3, task4 ];

    const p1 = createProject(project1, task1, task2);
    const p2 = createProject(project2, task3, task4);
    const projects = [ p1, p2 ];

    it('should not duplicate', () => {
      const rows = createRows(tasks, {}, {}, WorklogGrouping.DATE, projects, []);
      expect(rows.length).toBe(1);
      expect(rows[0].projects).toEqual([ project1, project2 ]);
    });

    it('should show project of parent task', () => {
      const rows = createRows(tasks, {}, {}, WorklogGrouping.TASK, projects, []);
      expect(rows.length).toBe(3);
      expect(rows[0].projects).toEqual([ project1 ]);
      expect(rows[1].projects).toEqual([ project1 ]);
      expect(rows[2].projects).toEqual([ project2 ]);
    });
  });

  describe('tags', () => {
    const parentTaskId = '1PT1', subTaskId = '2ST1', otherTaskId = '3OT1';
    const tagId1 = 'Tag1', tagId2 = 'Tag2';

    const parentTask = createTask({ id: parentTaskId });
    const subTask = createSubTask({ id: subTaskId }, parentTask);
    const otherTask = createTask({ id: otherTaskId });
    const allTasks = [ parentTask, subTask, otherTask ];

    const tag1 = createTag(tagId1, parentTask);
    const tag2 = createTag(tagId2, parentTask, otherTask);
    const allTags = [ tag1, tag2 ];

    it('should not duplicate tags when grouping by date', () => {
      const rows = createRows(allTasks, {}, {}, WorklogGrouping.DATE, [], allTags);
      expect(rows.length).toBe(1);
      expect(rows[0].tags).toEqual([tagId1, tagId2]);
    });

    it('should not duplicate tags when grouping by parent', () => {
      const rows = createRows(allTasks, {}, {}, WorklogGrouping.PARENT, [], allTags);
      expect(rows.length).toBe(2);
      expect(rows[0].tags).toEqual([ tagId1, tagId2 ]);
      expect(rows[1].tags).toEqual([ tagId2 ]);
    });

    it('should use the tags of the parent task', () => {
      const rows = createRows(allTasks, {}, {}, WorklogGrouping.TASK, [], allTags);
      expect(rows.length).toBe(2);
      expect(rows[0].tags).toEqual([ tagId1, tagId2 ]);
      expect(rows[1].tags).toEqual([ tagId2 ]);
    });

    it('should have today tags', () => {
      const todayTaskId = 'T1', todayTagId = 'Tag1';
      const todayTask = createTask({ id: todayTaskId });
      const tagToday = createTag(todayTagId, todayTask);
      const rows = createRows([ todayTask ], {}, {}, WorklogGrouping.DATE, [], [ tagToday ]);
      expect(rows.length).toBe(1);
      expect(rows[0].tags).toEqual([todayTagId]);
    });
  });

  describe('notes', () => {
    const note1 = 'N1', note2 = 'N2';
    describe('duplicates', () => {
      const task1 = createTask({ id: 'T1', notes: note1, timeSpentOnDay: { [dateKey1]: oneHour, [dateKey2]: oneHour }});
      const task2 = createTask({ id: 'T2', notes: note2 });

      it('should not duplicate notes when grouping by date', () => {
        const rows = createRows([task1, task2], {}, {}, WorklogGrouping.DATE, [], []);
        expect(rows.length).toBe(2);
        expect(rows[0].notes).toEqual([note1, note2]);
        expect(rows[1].notes).toEqual([note1]);
      });

      it('should not duplicate notes when grouping by task', () => {
        const rows = createRows([ task1, task2 ], {}, {}, WorklogGrouping.TASK, [], []);
        expect(rows.length).toBe(2);
        expect(rows[0].notes).toEqual([note1]);
        expect(rows[1].notes).toEqual([note2]);
      });
    });

    it('should show correct notes of sub/parent tasks', () => {
      const parentTaskId = 'P1', subTaskId = 'ST1';
      const t1 = createTask({ id: parentTaskId, notes: note1 });
      const t2 = createSubTask({ id: subTaskId, notes: note2 }, t1);
      const rows = createRows([ t1, t2 ], {}, {}, WorklogGrouping.DATE, [], []);
      expect(rows.length).toBe(1);
      expect(rows[0].notes).toEqual([note1, note2]);
    });

    it('should replace \\n with dashes', () => {
      const noteWithNewLine = 'N1\nN1', expectedNote = 'N1 - N1';
      const task1 = createTask({ id: 'T1', notes: noteWithNewLine });
      const rows = createRows([ task1 ], {}, {}, WorklogGrouping.DATE, [], []);
      expect(rows.length).toBe(1);
      expect(rows[0].notes).toEqual([expectedNote]);
    });
  });

  describe('group by worklog', () => {
    it('should list all tasks and not group by task/date', () => {
      const task1 = 'T1', task2 = 'T2';
      const tasks = [
        createTask({ id:task1 }),
        createTask({ id:task2, timeSpentOnDay: { [dateKey1]: oneHour, [dateKey2]: oneHour } }),
      ];
      const rows = createRows(tasks, {}, {}, WorklogGrouping.WORKLOG, [], []);
      expect(rows.length).toBe(3);
      expect(rows[0].titlesWithSub).toEqual([ task1 ]);
      expect(rows[0].dates).toEqual([ dateKey1]);
      expect(rows[1].titlesWithSub).toEqual([ task2 ]);
      expect(rows[1].dates).toEqual([ dateKey1 ]);
      expect(rows[2].titlesWithSub).toEqual([ task2 ]);
      expect(rows[2].dates).toEqual([ dateKey2 ]);
    });
  });
});
