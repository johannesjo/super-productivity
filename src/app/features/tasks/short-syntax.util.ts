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
    const newTagTitles = ((taskChanges.title || task.title) as string).match(SHORT_SYNTAX_TAGS_REG_EX);
    if (newTagTitles && newTagTitles.length) {
      const newTagTitlesTrimmed: string[] = newTagTitles
        .map(title => title.trim().replace('#', ''))
        .filter(newTagTitle => isNaN(newTagTitle as any) && newTagTitle.length >= 1);

      const tagIdsToAdd: string[] = [];
      newTagTitlesTrimmed.forEach(newTagTitle => {
        const existingTag = allTags.find(tag => newTagTitle.toLowerCase() === tag.title.toLowerCase());
        if (existingTag) {
          if (!task.tagIds?.includes(existingTag.id)) {
            tagIdsToAdd.push(existingTag.id);
          }
        } else {
          newTagTitlesToCreate.push(newTagTitle);
        }
      });

      taskChanges.tagIds = [...task.tagIds as string[], ...tagIdsToAdd];
      taskChanges.title = ((taskChanges.title || task.title) as string).replace(SHORT_SYNTAX_TAGS_REG_EX, '').trim();

      // console.log(newTask.title);
      // console.log('newTagTitles', newTagTitles);
      // console.log('newTagTitlesTrimmed', newTagTitlesTrimmed);
      // console.log('allTags)', allTags.map(tag => `${tag.id}: ${tag.title}`));
      // console.log('newTagIds', newTagIds);
      // console.log('newTask.title', newTask.title);
    }
  }

  if (!newTagTitlesToCreate.length && Object.keys(taskChanges).length === 0) {
    return undefined;
  }

  return {taskChanges, newTagTitles: newTagTitlesToCreate};
};
