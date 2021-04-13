import * as moment from 'moment';
import { msToClockString } from '../../../ui/duration/ms-to-clock-string.pipe';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { roundDuration } from '../../../util/round-duration';
import { roundTime } from '../../../util/round-time';
import { unique } from '../../../util/unique';
import { ProjectCopy } from '../../project/project.model';
import { TagCopy } from '../../tag/tag.model';
import { WorklogTask } from '../../tasks/task.model';
import { WorklogExportSettingsCopy, WorklogGrouping } from '../worklog.model';
import { RowItem, WorklogExportData } from './worklog-export.model';

const LINE_SEPARATOR = '\n';
const EMPTY_VAL = ' - ';

export const createRows = (data: WorklogExportData, groupBy: WorklogGrouping): RowItem[] => {
  let groups: { [key: string]: RowItem } = {};

  switch (groupBy) {
    case WorklogGrouping.DATE:
      groups = handleDateGroup(data);
      break;
    case WorklogGrouping.WORKLOG: // don't group at all
      groups = handleWorklogGroup(data);
      break;
    default: // group by TASK/PARENT
      groups = handleTaskGroup(data, groupBy);
  }

  const rows: RowItem[] = [];
  Object.keys(groups).sort().forEach((key => {
    const group = groups[key];

    group.titlesWithSub = unique(group.tasks.map(t => t.title));
    // TODO check all the typing
    group.titles = unique<any>(
      group.tasks.map((t: WorklogTask) => (
        t.parentId && (data.tasks.find(ptIN => ptIN.id === t.parentId) as WorklogTask).title
      ) || (!t.parentId && t.title)
      )
    ).filter((title: string) => !!title);
    group.dates = unique(sortDateStrings(group.dates));

    group.notes = group.notes.map((note) => {
      return note.replace(/\n/g, ' - ');
    });

    group.projects = unique(group.projects);
    group.projects = group.projects.map((pId: string) => {
      return (data.projects.find(project => project.id === pId) as ProjectCopy).title;
    });

    group.tags = unique(group.tags);
    group.tags = group.tags.map((tId: string) => {
      return (data.tags.find(tag => tag.id === tId) as TagCopy).title;
    });

    rows.push(group);
  }));

  return rows;
};

const handleDateGroup = (data: WorklogExportData): { [key: string]: RowItem } => {
  const groups: { [key: string]: RowItem } = {};
  for (const task of data.tasks) {
    if (!task.timeSpentOnDay) { continue; }

    const taskGroups: { [key: string]: RowItem } = {};
    const numDays = Object.keys(task.timeSpentOnDay).length;
    Object.keys(task.timeSpentOnDay).forEach(day => {
      taskGroups[day] = {
        dates: [day],
        tasks: [task],
        notes: (task.notes) ? [task.notes] : [],
        projects: (task.projectId) ? [task.projectId] : [],
        tags: task.tagIds,
        workStart: data.workTimes.start[day],
        workEnd: data.workTimes.end[day],
        timeSpent: 0,
        timeEstimate: 0
      };
      if (!task.subTaskIds || task.subTaskIds.length === 0) {
        taskGroups[day].timeSpent = task.timeSpentOnDay[day];
        taskGroups[day].timeEstimate = task.timeEstimate / numDays;
      }
    });

    Object.keys(taskGroups).forEach(groupKey => {
      if (groups[groupKey]) {
        groups[groupKey].tasks.push(...taskGroups[groupKey].tasks);
        groups[groupKey].notes.push(...taskGroups[groupKey].notes);
        groups[groupKey].projects.push(...taskGroups[groupKey].projects);
        groups[groupKey].tags = groups[groupKey].tags.concat(taskGroups[groupKey].tags);
        groups[groupKey].dates.push(...taskGroups[groupKey].dates);
        if (taskGroups[groupKey].workStart !== undefined) {
          // TODO check if this works as intended
          groups[groupKey].workStart = Math.min(groups[groupKey].workStart as number, taskGroups[groupKey].workStart as number);
        }
        if (taskGroups[groupKey].workEnd !== undefined) {
          // TODO check if this works as intended
          groups[groupKey].workEnd = Math.min(groups[groupKey].workEnd as number, taskGroups[groupKey].workEnd as number);
        }
        groups[groupKey].timeEstimate += taskGroups[groupKey].timeEstimate;
        groups[groupKey].timeSpent += taskGroups[groupKey].timeSpent;
      } else {
        groups[groupKey] = taskGroups[groupKey];
      }
    });
  }
  return groups;
};

/**
 * If we're grouping by parent task ignore subtasks
 * If we're grouping by task ignore parent tasks
 */
const skipTask = (task: WorklogTask, groupBy: WorklogGrouping): boolean => {
  return (groupBy === WorklogGrouping.PARENT && task.parentId !== null)
  || (groupBy === WorklogGrouping.TASK && task.subTaskIds.length > 0);
};

const handleTaskGroup = (data: WorklogExportData, groupBy: WorklogGrouping): { [key: string]: RowItem } => {
  const taskGroups: { [key: string]: RowItem } = {};
  for (const task of data.tasks) {
    if (skipTask(task, groupBy)) { continue; };
    taskGroups[task.id] = createEmptyGroup();

    // by design subtasks don't have tags, so we must set its parent's tags
    if (task.parentId !== null) {
      taskGroups[task.id].tags = (data.tasks.find(t => t.id === task.parentId) as WorklogTask).tagIds;
    } else {
      taskGroups[task.id].tags = task.tagIds;
    }

    taskGroups[task.id].tasks = [task];
    taskGroups[task.id].notes = (task.notes) ? [task.notes] : [];
    taskGroups[task.id].projects = (task.projectId) ? [task.projectId] : [];
    taskGroups[task.id].dates = Object.keys(task.timeSpentOnDay);
    taskGroups[task.id].timeEstimate = task.timeEstimate;
    taskGroups[task.id].timeSpent = Object.values(task.timeSpentOnDay).reduce((acc, curr) => acc + curr, 0);
  }
  return taskGroups;
};

const handleWorklogGroup = (data: WorklogExportData): { [key: string]: RowItem } => {
  const taskGroups: { [key: string]: RowItem } = {};
  for (const task of data.tasks) {
    Object.keys(task.timeSpentOnDay).forEach(day => {
      const groupKey = task.id + '_' + day;
      taskGroups[groupKey] = createEmptyGroup();
      taskGroups[groupKey].tasks = [task];
      taskGroups[groupKey].notes = (task.notes) ? [task.notes] : [];
      taskGroups[groupKey].projects = (task.projectId) ? [task.projectId] : [];
      taskGroups[groupKey].tags = task.tagIds;
      taskGroups[groupKey].dates = [day];
      taskGroups[groupKey].workStart = data.workTimes.start[day];
      taskGroups[groupKey].workEnd = data.workTimes.end[day];
      taskGroups[groupKey].timeEstimate = task.subTaskIds.length > 0 ? 0 : task.timeEstimate;
      taskGroups[groupKey].timeSpent = task.subTaskIds.length > 0 ? 0 : task.timeSpentOnDay[day];
    });
  }
  return taskGroups;
};

const createEmptyGroup = (): RowItem => {
  return {
    dates: [],
    timeSpent: 0,
    timeEstimate: 0,
    tasks: [],
    titlesWithSub: [],
    titles: [],
    notes: [],
    projects: [],
    tags: [],
    workStart: undefined,
    workEnd: undefined,
  };
};

const sortDateStrings = (dates: string[]): string[] => {
  return dates.sort((a: string, b: string) => {
    const dateA: number = new Date(a).getTime();
    const dateB: number = new Date(b).getTime();
    if (dateA === dateB) {
      return 0;
    } else if (dateA < dateB) {
      return -1;
    }
    return 1;
  });
};

export const formatRows = (rows: RowItem[], options: WorklogExportSettingsCopy): (string | number | undefined)[][] => {
  return rows.map((row: RowItem) => {
    return options.cols.map(col => {
      // TODO check if this is possible
      if (!col) {
        return;
      }
      if (!row.titles || !row.titlesWithSub) {
        throw new Error('Worklog: No titles');
      }

      const timeSpent = (options.roundWorkTimeTo)
        ? roundDuration(row.timeSpent, options.roundWorkTimeTo, true).asMilliseconds()
        : row.timeSpent;

      // If we're exporting raw worklogs, spread estimated time over worklogs belonging to a task based on
      // its share in time spent on the task
      let timeEstimate = row.timeEstimate;
      if (options.groupBy === WorklogGrouping.WORKLOG
        && (col === 'ESTIMATE_MS' || col === 'ESTIMATE_STR' || col === 'ESTIMATE_CLOCK')) {
        const timeSpentTotal = Object.values(row.tasks[0].timeSpentOnDay).reduce((acc, curr) => acc + curr, 0);
        const timeSpentPart = row.timeSpent / timeSpentTotal;
        console.log(`${row.timeSpent} / ${timeSpentTotal} = ${timeSpentPart}`);
        timeEstimate = timeEstimate * timeSpentPart;
      }

      switch (col) {
        case 'DATE':
          if (row.dates.length > 1) {
            return row.dates[0] + ' - ' + row.dates[row.dates.length - 1];
          }
          return row.dates[0];
        case 'START':
          const workStart = !row.workStart ? 0 : row.workStart;
          return (workStart)
            ? moment(
              (options.roundStartTimeTo)
                ? roundTime(workStart, options.roundStartTimeTo)
                : workStart
            ).format('HH:mm')
            : EMPTY_VAL;
        case 'END':
          return (row.workEnd)
            ? moment(
              (options.roundEndTimeTo && row.workEnd)
                ? roundTime(row.workEnd, options.roundEndTimeTo)
                : row.workEnd
            ).format('HH:mm')
            : EMPTY_VAL;
        case 'TITLES':
          return row.titles.join(options.separateTasksBy || '<br>');
        case 'TITLES_INCLUDING_SUB':
          return row.titlesWithSub.join(options.separateTasksBy || '<br>');
        case 'NOTES':
          return (row.notes.length !== 0) ? row.notes.join(options.separateTasksBy) : EMPTY_VAL;
        case 'PROJECTS':
          return (row.projects.length !== 0) ? row.projects.join(options.separateTasksBy) : EMPTY_VAL;
        case 'TAGS':
          return (row.tags.length !== 0) ? row.tags.join(options.separateTasksBy) : EMPTY_VAL;
        case 'TIME_MS':
          return timeSpent;
        case 'TIME_STR':
          return msToString(timeSpent);
        case 'TIME_CLOCK':
          return msToClockString(timeSpent);
        case 'ESTIMATE_MS':
          return timeEstimate;
        case 'ESTIMATE_STR':
          return msToString(timeEstimate);
        case 'ESTIMATE_CLOCK':
          return msToClockString(timeEstimate);
        default:
          return EMPTY_VAL;
      }
    });
  });
};

export const formatText = (headlineCols: string[], rows: (string | number | undefined)[][]): string => {
  let txt = '';
  txt += headlineCols.join(';') + LINE_SEPARATOR;
  txt += rows.map(cols => cols.join(';')).join(LINE_SEPARATOR);
  return txt;
};
