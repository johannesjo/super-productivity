import { casual } from 'chrono-node';
import { Task, TaskCopy } from './task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
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

const SHORT_SYNTAX_TIME_REG_EX =
  /(?:\s|^)t?((\d+(?:\.\d+)?[mhd])(?:\s*\/\s*(\d+(?:\.\d+)?[mhd]))?(?=\s|$))/i;
// NOTE: should come after the time reg ex is executed so we don't have to deal with those strings too

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

const SHORT_SYNTAX_PROJECT_REG_EX = new RegExp(`\\${CH_PRO}[^${ALL_SPECIAL}]+`, 'gi');
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
    // NOTE: we do this twice... :-O ...it's weird, but required to make whitespaces work as separator and not as one
    taskChanges = parseTimeSpentChanges(task);
    taskChanges = {
      ...taskChanges,
      ...parseScheduledDate(task, now),
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
    );
    taskChanges = {
      ...taskChanges,
      ...(changesForTag.taskChanges || {}),
    };
  }

  if (config.isEnableDue) {
    taskChanges = {
      ...taskChanges,
      // NOTE: because we pass the new taskChanges here we need to assignments...
      ...parseTimeSpentChanges(taskChanges),
      // title: taskChanges.title?.trim(),
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
    const projectTitleToMatch = projectTitle.replace(' ', '').toLowerCase();
    const indexBeforePlus =
      task.title.toLowerCase().lastIndexOf(CH_PRO + projectTitleToMatch) - 1;
    const charBeforePlus = task.title.charAt(indexBeforePlus);

    // don't parse Fun title+blu as project
    if (charBeforePlus && charBeforePlus !== ' ') {
      return {};
    }

    const existingProject = allProjects.find(
      (project) =>
        project.title.replace(' ', '').toLowerCase().indexOf(projectTitleToMatch) === 0,
    );

    if (existingProject) {
      return {
        title: task.title?.replace(`${CH_PRO}${projectTitle}`, '').trim(),
        projectId: existingProject.id,
      };
    }

    // also try only first word after special char
    const projectTitleFirstWordOnly = projectTitle.split(' ')[0];
    const projectTitleToMatch2 = projectTitleFirstWordOnly.replace(' ', '').toLowerCase();
    const existingProjectForFirstWordOnly = allProjects.find(
      (project) =>
        project.title.replace(' ', '').toLowerCase().indexOf(projectTitleToMatch2) === 0,
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

const parseTagChanges = (task: Partial<TaskCopy>, allTags?: Tag[]): TagChanges => {
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

          return (
            newTagTitle.length >= 1 &&
            // NOTE: we check this to not trigger for "#123 blasfs dfasdf"
            initialTitle.trim().lastIndexOf(newTagTitle) > 4
          );
        });

      const tagIdsToAdd: string[] = [];
      regexTagTitlesTrimmedAndFiltered.forEach((newTagTitle) => {
        const existingTag = allTags.find(
          (tag) => newTagTitle.toLowerCase() === tag.title.toLowerCase(),
        );
        if (existingTag) {
          if (!task.tagIds?.includes(existingTag.id)) {
            tagIdsToAdd.push(existingTag.id);
          }
        } else {
          newTagTitlesToCreate.push(newTagTitle);
        }
      });

      if (tagIdsToAdd.length) {
        taskChanges.tagIds = [...(task.tagIds as string[]), ...tagIdsToAdd];
      }

      if (
        newTagTitlesToCreate.length ||
        tagIdsToAdd.length ||
        regexTagTitlesTrimmedAndFiltered.length
      ) {
        taskChanges.title = initialTitle;
        regexTagTitlesTrimmedAndFiltered.forEach((tagTitle) => {
          taskChanges.title = taskChanges.title?.replace(`#${tagTitle}`, '');
        });
        taskChanges.title = taskChanges.title.trim();
      }

      // console.log(task.title);
      // console.log('newTagTitles', regexTagTitles);
      // console.log('newTagTitlesTrimmed', regexTagTitlesTrimmedAndFiltered);
      // console.log('allTags)', allTags.map(tag => `${tag.id}: ${tag.title}`));
      // console.log('task.tagIds', task.tagIds);
      // console.log('task.title', task.title);
    }
  }
  // console.log(taskChanges);

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
    const parsedDateArr = customDateParser.parse(task.title, now, {
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
        const due = new Date();
        due.setHours(nr, 0, 0, 0);
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
  if (matches && matches.length >= 3) {
    const full = matches[0];
    const timeSpent = matches[2]; // First part (before slash)
    const timeEstimate = matches[3]; // Second part (after slash)
    // If no slash, use the single value as timeEstimate only
    const hasSlashFormat = matches[3] !== undefined;
    return {
      ...(hasSlashFormat && timeSpent
        ? {
            timeSpentOnDay: {
              ...(task.timeSpentOnDay || {}),
              [getWorklogStr()]: stringToMs(timeSpent),
            },
          }
        : {}),
      ...(timeEstimate
        ? { timeEstimate: stringToMs(timeEstimate) }
        : timeSpent
          ? { timeEstimate: stringToMs(timeSpent) }
          : {}),
      title: task.title.replace(full, '').trim(),
    };
  }
  return {};
};
