import { Task, TaskCopy } from './task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { stringToMs } from '../../ui/duration/string-to-ms.pipe';
import { Tag } from '../tag/tag.model';
import { Project } from '../project/project.model';

export const SHORT_SYNTAX_TIME_REG_EX = / t?(([0-9]+(m|h|d)+)? *\/ *)?([0-9]+(m|h|d)+) *$/i;
// NOTE: should come after the time reg ex is executed so we don't have to deal with those strings too

const CH_PRO = '+';
const CH_TAG = '#';
const CH_DUE = '@';
const ALL_SPECIAL = `(\\${CH_PRO}|\\${CH_TAG}|\\${CH_DUE})`;

export const SHORT_SYNTAX_PROJECT_REG_EX = new RegExp(`\\${CH_PRO}[^${ALL_SPECIAL}]+`, 'gi');
export const SHORT_SYNTAX_TAGS_REG_EX = new RegExp(`\\${CH_TAG}[^${ALL_SPECIAL}]+`, 'gi');
// export const SHORT_SYNTAX_DUE_REG_EX = new RegExp(`\\${CH_DUE}[^${ALL_SPECIAL}]+`, 'gi');

export const shortSyntax = (task: Task | Partial<Task>, allTags?: Tag[], allProjects?: Project[]): {
  taskChanges: Partial<Task>,
  newTagTitles: string[],
  remindAt: number | null,
  projectId: string | undefined,
} | undefined => {
  if (!task.title) {
    return;
  }
  if (typeof (task.title as any) !== 'string') {
    throw new Error('No str');
  }

  // TODO clean up this mess
  let taskChanges: Partial<TaskCopy>;

  taskChanges = parseTimeSpentChanges(task);
  const changesForProject = parseProjectChanges({...task, title: taskChanges.title || task.title}, allProjects);
  if (changesForProject.projectId) {
    taskChanges = {
      ...taskChanges,
      title: changesForProject.title,
    };
  }

  const changesForTag = parseTagChanges({...task, title: taskChanges.title || task.title}, allTags);
  taskChanges = {
    ...taskChanges,
    ...changesForTag.taskChanges
  };

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
    newTagTitles: changesForTag.newTagTitlesToCreate,
    remindAt: null,
    projectId: changesForProject.projectId,
    // remindAt: changesForDue.remindAt
  };
};

const parseProjectChanges = (task: Partial<TaskCopy>, allProjects?: Project[]): {
  title?: string,
  projectId?: string,
} => {
  // don't allow for issue tasks
  if (task.issueId) {
    return {};
  }
  if (!Array.isArray(allProjects) || !allProjects || allProjects.length === 0) {
    return {};
  }
  if (!task.title) {
    return {};
  }

  const rr = task.title.match(SHORT_SYNTAX_PROJECT_REG_EX);

  if (rr && rr[0]) {
    const projectTitle: string = rr[0].trim().replace(CH_PRO, '');
    const existingProject = allProjects.find(
      project => project.title
        .replace(' ', '')
        .toLowerCase()
        .indexOf(
          projectTitle
            .replace(' ', '')
            .toLowerCase()
        ) === 0
    );

    if (existingProject) {
      return {
        title: task.title?.replace(`${CH_PRO}${projectTitle}`, '').trim(),
        projectId: existingProject.id,
      };
    }
  }

  return {};
};

const parseTagChanges = (task: Partial<TaskCopy>, allTags?: Tag[]): { taskChanges: Partial<TaskCopy>, newTagTitlesToCreate: string[] } => {
  const taskChanges: Partial<TaskCopy> = {};

  const newTagTitlesToCreate: string[] = [];
  // only exec if previous ones are also passed
  if (Array.isArray(task.tagIds) && Array.isArray(allTags)) {
    const initialTitle = task.title as string;
    const regexTagTitles = initialTitle.match(SHORT_SYNTAX_TAGS_REG_EX);
    if (regexTagTitles && regexTagTitles.length) {
      const regexTagTitlesTrimmedAndFiltered: string[] = regexTagTitles
        .map(title => title.trim().replace(CH_TAG, ''))
        .filter(newTagTitle =>
          newTagTitle.length >= 1
          && initialTitle.trim().indexOf(newTagTitle) > 4
        );

      const tagIdsToAdd: string[] = [];
      regexTagTitlesTrimmedAndFiltered.forEach(newTagTitle => {
        const existingTag = allTags.find(tag => newTagTitle.toLowerCase() === tag.title.toLowerCase());
        if (existingTag) {
          if (!task.tagIds?.includes(existingTag.id)) {
            tagIdsToAdd.push(existingTag.id);
          }
        } else {
          newTagTitlesToCreate.push(newTagTitle);
        }
      });

      if (tagIdsToAdd.length) {
        taskChanges.tagIds = [...task.tagIds as string[], ...tagIdsToAdd];
      }

      if (newTagTitlesToCreate.length || tagIdsToAdd.length) {
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
    newTagTitlesToCreate
  };
};

const parseTimeSpentChanges = (task: Partial<TaskCopy>): Partial<Task> => {
  if (!task.title) {
    return {};
  }

  const matches = SHORT_SYNTAX_TIME_REG_EX.exec(task.title);

  if (matches && matches.length >= 3) {
    const full = matches[0];
    const timeSpent = matches[2];
    const timeEstimate = matches[4];

    return {
      ...(
        timeSpent
          ? {
            timeSpentOnDay: {
              ...(task.timeSpentOnDay || {}),
              [getWorklogStr()]: stringToMs(timeSpent)
            }
          }
          : {}
      ),
      timeEstimate: stringToMs(timeEstimate),
      title: task.title.replace(full, '')
    };
  }

  return {};
};

// const parseDueChanges = (task: Partial<TaskCopy>): {
//   title?: string;
//   remindAt?: number;
// } => {
//   if (!task.title) {
//     return {};
//   }
//
//   const matches = SHORT_SYNTAX_DUE_REG_EX.exec(task.title);
//   console.log(matches);
//
//   if (matches && matches[0]) {
//     const dateStr = matches[0].replace(CH_DUE, '');
//     console.log(dateStr);
//     const m = moment(dateStr);
//     if (m.isValid()) {
//       const title = task.title.replace(matches[0], '');
//       console.log(m);
//       console.log(title);
//     } else {
//       // TODO parse clock string here
//     }
//   }
//   return {};
// };
