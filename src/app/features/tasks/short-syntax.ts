import { casual } from 'chrono-node';
import { Task, TaskCopy } from './task.model';
import { getDbDateStr } from '../../util/get-db-date-str';
import { stringToMs } from '../../ui/duration/string-to-ms.pipe';
import { Tag } from '../tag/tag.model';
import { Project } from '../project/project.model';
import { ShortSyntaxConfig } from '../config/global-config.model';
type ProjectChanges = {
  title?: string;
  projectId?: string;
};
type TagChanges = {
  taskChanges?: Partial<TaskCopy>;
  newTagTitlesToCreate?: string[];
};
type DueChanges = {
  title?: string;
  dueWithTime?: number;
};

const CH_TSP = '/';
// Due how this expression capture clusters of duration units, be mindful of
// match boundary whitespace during processing
export const SHORT_SYNTAX_TIME_REG_EX = new RegExp(
  String.raw`(?:\s|^)t?((?:\d+(?:\.\d+)?[mhd]\s*)+)(?:\s*` +
    `\\${CH_TSP}` +
    String.raw`((?:\s*\d+(?:\.\d+)?[mhd])+)?)?(?=\s|$)`,
  'i',
);

const CH_PRO = '+';
const CH_TAG = '#';
const CH_DUE = '@';
const ALL_SPECIAL = `(\\${CH_PRO}|\\${CH_TAG}|\\${CH_DUE})`;

const customDateParser = casual.clone();
customDateParser.refiners.push({
  refine: (context, results) => {
    results.forEach((result) => {
      const { refDate, text, start } = result;
      const regex = / [5-9][0-9]$/;
      const yearIndex = text.search(regex);
      // The year pattern in Chrono's source code is (?:[1-9][0-9]{0,3}\\s{0,2}(?:BE|AD|BC|BCE|CE)|[1-2][0-9]{3}|[5-9][0-9]|2[0-5]).
      // This means any two-digit numeric value from 50 to 99 will be considered a year.
      // Link: https://github.com/wanasit/chrono/blob/54e7ff12f9185e735ee860c25922b2ab2367d40b/src/locales/en/constants.ts#L234C30-L234C108
      // When someone creates a task like "Test @25/4 90m", Chrono will return the year as 1990, which is an undesirable behaviour in most cases.
      if (yearIndex !== -1) {
        result.text = text.slice(0, yearIndex);
        const current = new Date();
        let year = current.getFullYear();
        // If the parsed month is smaller than the current month,
        // it means the time is for next year. For example, parsed month is March
        // and it is currently April
        const impliedDate = start.get('day');
        const impliedMonth = start.get('month');
        // Due to the future-forward nature of the date parser, there are two scenarios that the implied year is next year:
        // - Implied month is smaller than current month i.e. 20/3 vs 2/4
        // - Same month but the implied date is before the current date i.e. 14/4 vs 20/4
        if (
          (impliedMonth && impliedMonth < refDate.getMonth() + 1) ||
          (impliedMonth === refDate.getMonth() + 1 &&
            impliedDate &&
            impliedDate < refDate.getDate())
        ) {
          // || (impliedMonth === refDate.getMonth() + 1 && impliedDay && impliedDay < refDate.getDay())
          year += 1;
        }
        result.start.assign('year', year);
      }
    });
    return results;
  },
});

// The following project name extraction pattern attempts to improve on the
// previous version by not immediately terminating upon encountering a short
// syntax delimiting character and looks ahead to consider usage context
const SHORT_SYNTAX_PROJECT_REG_EX = new RegExp(
  `\\${CH_PRO}((?:(?!\\s+(?:\\${CH_TAG}|\\${CH_DUE}|t?\\d+[mh]\\b)).)+)`,
  'i',
);
const SHORT_SYNTAX_TAGS_REG_EX = new RegExp(`\\${CH_TAG}[^${ALL_SPECIAL}|\\s]+`, 'gi');

// Literal notation: /\@[^\+|\#|\@]/gi
// Match string starting with the literal @ and followed by 1 or more of the characters
// not in the ALL_SPECIAL
const SHORT_SYNTAX_DUE_REG_EX = new RegExp(`\\${CH_DUE}[^${ALL_SPECIAL}]+`, 'gi');

export const shortSyntax = (
  task: Task | Partial<Task>,
  config: ShortSyntaxConfig,
  allTags?: Tag[],
  allProjects?: Project[],
  now = new Date(),
  mode: 'combine' | 'replace' = 'combine',
):
  | {
      taskChanges: Partial<Task>;
      newTagTitles: string[];
      remindAt: number | null;
      projectId: string | undefined;
    }
  | undefined => {
  if (!task.title) {
    return;
  }
  if (typeof (task.title as any) !== 'string') {
    throw new Error('No str');
  }

  // TODO clean up this mess
  let taskChanges: Partial<TaskCopy> = {};
  let changesForProject: ProjectChanges = {};
  let changesForTag: TagChanges = {};

  if (config.isEnableDue) {
    taskChanges = parseTimeSpentChanges(task);
    taskChanges = {
      ...taskChanges,
      ...parseScheduledDate({ ...task, title: taskChanges.title || task.title }, now),
    };
  }

  if (config.isEnableProject) {
    changesForProject = parseProjectChanges(
      { ...task, title: taskChanges.title || task.title },
      allProjects?.filter((p) => !p.isArchived && !p.isHiddenFromMenu),
    );
    if (changesForProject.projectId) {
      taskChanges = {
        ...taskChanges,
        title: changesForProject.title,
      };
    }
  }

  if (config.isEnableTag) {
    changesForTag = parseTagChanges(
      { ...task, title: taskChanges.title || task.title },
      allTags,
      mode,
    );
    taskChanges = {
      ...taskChanges,
      ...(changesForTag.taskChanges || {}),
    };
  }

  // const changesForDue = parseDueChanges({...task, title: taskChanges.title || task.title});
  // if (changesForDue.remindAt) {
  //   taskChanges = {
  //     ...taskChanges,
  //     title: changesForDue.title,
  //   };
  // }

  if (Object.keys(taskChanges).length === 0) {
    return undefined;
  }

  return {
    taskChanges,
    newTagTitles: changesForTag.newTagTitlesToCreate || [],
    remindAt: null,
    projectId: changesForProject.projectId,
    // remindAt: changesForDue.remindAt
  };
};

const parseProjectChanges = (
  task: Partial<TaskCopy>,
  allProjects?: Project[],
): ProjectChanges => {
  if (
    task.issueId || // don't allow for issue tasks
    !task.title ||
    !Array.isArray(allProjects) ||
    !allProjects ||
    allProjects.length === 0
  ) {
    return {};
  }

  const rr = task.title.match(SHORT_SYNTAX_PROJECT_REG_EX);

  if (rr && rr[0]) {
    const projectTitle: string = rr[0].trim().replace(CH_PRO, '');
    const projectTitleToMatch = projectTitle.replaceAll(' ', '').toLowerCase();
    const indexBeforePlus =
      task.title.toLowerCase().lastIndexOf(CH_PRO + projectTitleToMatch) - 1;
    const charBeforePlus = task.title.charAt(indexBeforePlus);

    // don't parse Fun title+blu as project
    if (charBeforePlus && charBeforePlus !== ' ') {
      return {};
    }

    // Prefer shortest prefix-based project title match
    const sortedAllProjects = allProjects
      .slice()
      .sort((p1, p2) => p1.title.length - p2.title.length);

    const existingProject = sortedAllProjects.find(
      (project) =>
        project.title.replaceAll(' ', '').toLowerCase().indexOf(projectTitleToMatch) ===
        0,
    );

    if (existingProject) {
      return {
        title: task.title
          ?.replace(`${CH_PRO}${projectTitle}`, '')
          .trim()
          .replace('  ', ' '),
        projectId: existingProject.id,
      };
    }

    // also try only first word after special char
    const projectTitleFirstWordOnly = projectTitle.split(' ')[0];
    const projectTitleToMatch2 = projectTitleFirstWordOnly.replace(' ', '').toLowerCase();
    const existingProjectForFirstWordOnly = sortedAllProjects.find(
      (project) =>
        project.title.replaceAll(' ', '').toLowerCase().indexOf(projectTitleToMatch2) ===
        0,
    );

    if (existingProjectForFirstWordOnly) {
      return {
        title: task.title
          ?.replace(`${CH_PRO}${projectTitleFirstWordOnly}`, '')
          .trim()
          // get rid of excess whitespaces
          .replace('  ', ' '),
        projectId: existingProjectForFirstWordOnly.id,
      };
    }
  }

  return {};
};

const parseTagChanges = (
  task: Partial<TaskCopy>,
  allTags?: Tag[],
  mode: 'combine' | 'replace' = 'combine',
): TagChanges => {
  const taskChanges: Partial<TaskCopy> = {};

  const newTagTitlesToCreate: string[] = [];
  // only exec if previous ones are also passed
  if (Array.isArray(task.tagIds) && Array.isArray(allTags)) {
    const initialTitle = task.title as string;
    const regexTagTitles = initialTitle.match(SHORT_SYNTAX_TAGS_REG_EX);

    if (regexTagTitles && regexTagTitles.length) {
      const regexTagTitlesTrimmedAndFiltered: string[] = regexTagTitles
        .map((title) => title.trim().replace(CH_TAG, ''))
        .filter((newTagTitle) => {
          const charBeforeTag = initialTitle.charAt(
            initialTitle.lastIndexOf(CH_TAG + newTagTitle) - 1,
          );
          // don't parse Fun title#blu as tag
          if (charBeforeTag && charBeforeTag !== ' ') {
            return false;
          }

          const trimmedTitle = initialTitle.trim();
          const tagStartIndex = trimmedTitle.lastIndexOf(`${CH_TAG}${newTagTitle}`);
          const isNumericOnly = /^[0-9]+$/.test(newTagTitle);

          return (
            newTagTitle.length >= 1 &&
            tagStartIndex !== -1 &&
            // NOTE: only block tags at the beginning if they are numeric (e.g. "#123 task")
            (!isNumericOnly || tagStartIndex > 0)
          );
        });

      const matchingTagIds: string[] = [];
      regexTagTitlesTrimmedAndFiltered.forEach((newTagTitle) => {
        const existingTag = allTags.find(
          (tag) => newTagTitle.toLowerCase() === tag.title.toLowerCase(),
        );
        if (existingTag) {
          matchingTagIds.push(existingTag.id);
        } else {
          newTagTitlesToCreate.push(newTagTitle);
        }
      });

      if (mode === 'replace') {
        // Check if arrays arent the same
        if (
          !(
            task.tagIds.length === matchingTagIds.length &&
            task.tagIds.every((val, i) => val === matchingTagIds[i])
          )
        ) {
          taskChanges.tagIds = matchingTagIds;
        }
      } else {
        const tagIdsToAdd: string[] = [];
        matchingTagIds.forEach((id) => {
          if (!task.tagIds?.includes(id)) {
            tagIdsToAdd.push(id);
          }
        });
        if (tagIdsToAdd.length) {
          taskChanges.tagIds = [...(task.tagIds as string[]), ...tagIdsToAdd];
        }
      }

      if (
        newTagTitlesToCreate.length ||
        taskChanges.tagIds?.length ||
        regexTagTitlesTrimmedAndFiltered.length
      ) {
        taskChanges.title = initialTitle;
        regexTagTitlesTrimmedAndFiltered.forEach((tagTitle) => {
          taskChanges.title = taskChanges.title?.replace(`#${tagTitle}`, '');
        });
        taskChanges.title = taskChanges.title.trim();
      }

      // TaskLog.log(task.title);
      // TaskLog.log('newTagTitles', regexTagTitles);
      // TaskLog.log('newTagTitlesTrimmed', regexTagTitlesTrimmedAndFiltered);
      // TaskLog.log('allTags)', allTags.map(tag => `${tag.id}: ${tag.title}`));
      // TaskLog.log('task.tagIds', task.tagIds);
      // TaskLog.log('task.title', task.title);
    }
  }
  // TaskLog.log(taskChanges);

  return {
    taskChanges,
    newTagTitlesToCreate,
  };
};

const parseScheduledDate = (task: Partial<TaskCopy>, now: Date): DueChanges => {
  if (!task.title) {
    return {};
  }
  const rr = task.title.match(SHORT_SYNTAX_DUE_REG_EX);

  if (rr && rr[0]) {
    const parsedDateArr = customDateParser.parse(rr[0], now, {
      forwardDate: true,
    });

    if (parsedDateArr.length) {
      const parsedDateResult = parsedDateArr[0];
      const start = parsedDateResult.start;
      const due = start.date().getTime();
      let hasPlannedTime = true;
      // If user doesn't explicitly enter time, set the scheduled date
      // to 9:00:00 of the given day

      if (!start.isCertain('hour')) {
        hasPlannedTime = false;
      }
      let inputDate = parsedDateResult.text;
      // Hacky way to strip short syntax for time estimate that was
      // accidentally included in the date parser
      // For example: the task is "Task @14/4 90m" and we don't want "90m"
      if (inputDate.match(/ [0-9]{1,}m/g)) {
        inputDate += 'm';
      }
      return {
        dueWithTime: due,
        // Strip out the short syntax for scheduled date and given date
        title: task.title.replace(`@${inputDate}`, ''),
        ...(hasPlannedTime ? {} : { hasPlannedTime: false }),
      };
    }

    const simpleMatch = rr[0].match(/\d+/);
    if (simpleMatch && simpleMatch[0] && typeof +simpleMatch[0] === 'number') {
      const nr = +simpleMatch[0];
      if (nr <= 24) {
        const due = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          nr,
          0,
          0,
          0,
        );

        // If the scheduled time has already passed today, schedule for tomorrow
        if (due.getTime() <= now.getTime()) {
          due.setDate(due.getDate() + 1);
        }

        return {
          dueWithTime: due.getTime(),
          title: task.title.replace(`@${nr}`, ''),
        };
      }
    }
  }

  return {};
};

const parseTimeSpentChanges = (task: Partial<TaskCopy>): Partial<Task> => {
  if (!task.title) {
    return {};
  }

  const matches = SHORT_SYNTAX_TIME_REG_EX.exec(task.title);
  if (!matches) {
    return {};
  }

  const [matchSpan, preSplit, postSplit] = matches;
  const timeSpent = matchSpan.includes(CH_TSP) ? preSplit : null;
  const timeEstimate = timeSpent === null ? preSplit : postSplit;

  return {
    ...(typeof timeSpent === 'string' && {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [getDbDateStr()]: timeSpent
          .split(/\s+/g)
          .reduce((ms, s) => ms + stringToMs(s), 0),
      },
    }),
    ...(typeof timeEstimate === 'string' && {
      timeEstimate: timeEstimate.split(/\s+/g).reduce((ms, s) => ms + stringToMs(s), 0),
    }),
    title: task.title.replace(matchSpan, '').trim(),
  };
};
