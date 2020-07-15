import { Task, TaskCopy } from './task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { stringToMs } from '../../ui/duration/string-to-ms.pipe';
import { Tag } from '../tag/tag.model';

export const SHORT_SYNTAX_TIME_REG_EX = / t?(([0-9]+(m|h|d)+)? *\/ *)?([0-9]+(m|h|d)+) *$/i;
// NOTE: should come after the time reg ex is executed so we don't have to deal with those strings too
export const SHORT_SYNTAX_TAGS_REG_EX = /\#[^\#]+/gi;

export const shortSyntax = (task: Task | Partial<Task>, allTags?: Tag[]): Task | Partial<Task> => {
  let newTask: Partial<TaskCopy> = {...task};
  if (!newTask.title) {
    return task;
  }

  const matches = SHORT_SYNTAX_TIME_REG_EX.exec(newTask.title);

  if (matches && matches.length >= 3) {
    const full = matches[0];
    const timeSpent = matches[2];
    const timeEstimate = matches[4];

    newTask = {
      ...newTask,
      ...(
        timeSpent
          ? {
            timeSpentOnDay: {
              ...(newTask.timeSpentOnDay || {}),
              [getWorklogStr()]: stringToMs(timeSpent)
            }
          }
          : {}
      ),
      timeEstimate: stringToMs(timeEstimate),
      title: newTask.title.replace(full, '')
    };
  }

  // only exec if previous ones are also passed
  if (Array.isArray(newTask.tagIds) && Array.isArray(allTags)) {

    const newTagTitles = (newTask.title as string).match(SHORT_SYNTAX_TAGS_REG_EX);
    if (newTagTitles && newTagTitles.length) {
      const newTagTitlesTrimmed: string[] = newTagTitles
        .map(title => title.trim().replace('#', ''))
        .filter(newTagTitle => isNaN(newTagTitle as any) && newTagTitle.length >= 1);

      const newTagIds = allTags
        // NOTE requires exact match
        .filter(tag => newTagTitlesTrimmed.find(newTagTitle => newTagTitle.toLowerCase() === tag.title.toLowerCase()) && !newTask.tagIds?.includes(tag.id))
        .map(tag => tag.id);

      newTask.tagIds = [...newTask.tagIds as string[], ...newTagIds];
      newTask.title = (newTask.title as string).replace(SHORT_SYNTAX_TAGS_REG_EX, '').trim();

      // console.log(newTask.title);
      // console.log('newTagTitles', newTagTitles);
      // console.log('newTagTitlesTrimmed', newTagTitlesTrimmed);
      // console.log('allTags)', allTags.map(tag => `${tag.id}: ${tag.title}`));
      // console.log('newTagIds', newTagIds);
      // console.log('newTask.title', newTask.title);
    }
  }

  return newTask;
};
