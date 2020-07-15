import { Task, TaskCopy } from './task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { stringToMs } from '../../ui/duration/string-to-ms.pipe';
import { Tag } from '../tag/tag.model';

export const SHORT_SYNTAX_TIME_REG_EX = / t?(([0-9]+(m|h|d)+)? *\/ *)?([0-9]+(m|h|d)+) *$/i;
// NOTE: should come after the time reg ex is executed so we don't have to deal with those strings too
export const SHORT_SYNTAX_TAGS_REG_EX = /\#[^\#]+/gi;

export const shortSyntax = (task: Task | Partial<Task>, allTags?: Tag[]): {
  taskChanges: Partial<Task>,
  newTagTitles: string[]
} | undefined => {
  let taskChanges: Partial<TaskCopy> = {};
  if (!task.title) {
    return;
  }

  const matches = SHORT_SYNTAX_TIME_REG_EX.exec(task.title);

  if (matches && matches.length >= 3) {
    const full = matches[0];
    const timeSpent = matches[2];
    const timeEstimate = matches[4];

    taskChanges = {
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

  const newTagTitlesToCreate: string[] = [];
  // only exec if previous ones are also passed
  if (Array.isArray(task.tagIds) && Array.isArray(allTags)) {
    const initialTitle = ((taskChanges.title || task.title) as string);
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
      // console.log('taskChanges.tagIds', taskChanges.tagIds);
      // console.log('taskChanges.title', taskChanges.title);
    }
  }

  if (!newTagTitlesToCreate.length && Object.keys(taskChanges).length === 0) {
    return undefined;
  }

  return {taskChanges, newTagTitles: newTagTitlesToCreate};
};
