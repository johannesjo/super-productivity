import { Task, TaskCopy } from './task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { stringToMs } from '../../ui/duration/string-to-ms.pipe';
import { Tag } from '../tag/tag.model';
import { Project } from '../project/project.model';

export const SHORT_SYNTAX_TIME_REG_EX = / t?(([0-9]+(m|h|d)+)? *\/ *)?([0-9]+(m|h|d)+) *$/i;
// NOTE: should come after the time reg ex is executed so we don't have to deal with those strings too

const CH_PRO = '+';
const CH_TAG = '#';
export const SHORT_SYNTAX_TAGS_REG_EX = new RegExp(`\\${CH_TAG}[^\\${CH_TAG}]+`, 'gi');
export const SHORT_SYNTAX_PROJECT_REG_EX = new RegExp(`\\${CH_PRO}[^\\${CH_PRO}]+`, 'gi');

export const shortSyntax = (task: Task | Partial<Task>, allTags?: Tag[], allProjects?: Project[]): {
  taskChanges: Partial<Task>,
  newTagTitles: string[],
  remindAt: number | null,
} | undefined => {
  if (!task.title) {
    return;
  }

  // TODO clean up this mess
  let taskChanges: Partial<TaskCopy>;

  taskChanges = parseTimeSpentChanges(task);
  taskChanges = {
    ...taskChanges,
    ...parseProjectChanges({...task, title: taskChanges.title || task.title}, allProjects)
  };

  const rTag = parseTagChanges({...task, title: taskChanges.title || task.title}, allTags);
  taskChanges = {
    ...taskChanges,
    ...rTag.taskChanges
  };

  if (Object.keys(taskChanges).length === 0) {
    return undefined;
  }

  return {taskChanges, newTagTitles: rTag.newTagTitlesToCreate, remindAt: null};
};

const parseProjectChanges = (task: Partial<TaskCopy>, allProjects?: Project[]): Partial<TaskCopy> => {
  // don't allow for issue tasks
  if (task.issueId) {
    return {};
  }
  // TODO check if we can allow this
  if (task.projectId) {
    return {};
  }
  if (!Array.isArray(allProjects) || !allProjects || allProjects.length === 0) {
    return {};
  }

  const initialTitle = task.title as string;
  const rr = initialTitle.match(SHORT_SYNTAX_PROJECT_REG_EX);

  if (rr && rr[0]) {
    const projectTitle: string = rr[0].trim().replace('+', '');
    const existingProject = allProjects.find(project => projectTitle.toLowerCase() === project.title.toLowerCase());

    if (existingProject) {
      return {
        title: task.title?.replace(`+${projectTitle}`, '').trim(),
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
        .map(title => title.trim().replace('#', ''))
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
  console.log(taskChanges);

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
